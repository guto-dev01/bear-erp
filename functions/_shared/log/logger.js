'use strict';

/**
 * Log estruturado (JSON em stdout) com proteção de dados sensíveis (LGPD).
 *
 * Regras (Parte 4 / Parte 0):
 *  - Nunca emitir chave privada, senha de certificado, conteúdo de .pfx nem
 *    XML com dados pessoais em texto plano.
 *  - CPF e PIS/NIS são mascarados, preservando só o suficiente para suporte.
 *
 * O mascaramento é defensivo: qualquer chave cujo nome bata com a lista de
 * segredos vira "[REDACTED]", recursivamente, antes de serializar.
 */

const CHAVES_SENSIVEIS =
  /(senha|password|secret|pfx|p12|privatekey|privada|x509|chaveprivada|apikey|api_key|token|authorization)/i;

const CHAVES_CPF = /(cpf)/i;
const CHAVES_PIS = /(pis|pasep|nis)/i;

/** Mantém os 3 primeiros e 2 últimos dígitos: 12345678909 → 123******09 */
function mascararDocumento(valor) {
  if (valor == null) return valor;
  const digitos = String(valor).replace(/\D/g, '');
  if (digitos.length < 5) return '***';
  const inicio = digitos.slice(0, 3);
  const fim = digitos.slice(-2);
  return `${inicio}${'*'.repeat(digitos.length - 5)}${fim}`;
}

const mascararCpf = mascararDocumento;
const mascararPis = mascararDocumento;

function redagir(valor, profundidade = 0) {
  if (profundidade > 8) return '[depth-limit]';
  if (valor == null) return valor;
  if (Buffer.isBuffer(valor)) return `[Buffer ${valor.length}b]`;
  if (Array.isArray(valor)) {
    return valor.map((v) => redagir(v, profundidade + 1));
  }
  if (typeof valor === 'object') {
    const saida = {};
    for (const [chave, v] of Object.entries(valor)) {
      if (CHAVES_SENSIVEIS.test(chave)) {
        saida[chave] = '[REDACTED]';
      } else if (CHAVES_CPF.test(chave)) {
        saida[chave] = mascararCpf(v);
      } else if (CHAVES_PIS.test(chave)) {
        saida[chave] = mascararPis(v);
      } else {
        saida[chave] = redagir(v, profundidade + 1);
      }
    }
    return saida;
  }
  return valor;
}

function emitir(nivel, mensagem, contexto, escopo) {
  const linha = {
    nivel,
    ts: new Date().toISOString(),
    msg: mensagem,
    ...(escopo ? { escopo } : {}),
    ...(contexto ? { ctx: redagir(contexto) } : {}),
  };
  const texto = JSON.stringify(linha);
  if (nivel === 'error') process.stderr.write(texto + '\n');
  else process.stdout.write(texto + '\n');
}

/**
 * Cria um logger com escopo fixo (ex.: nome da function/módulo).
 * @param {string} [escopo]
 */
function criarLogger(escopo) {
  return {
    info: (msg, ctx) => emitir('info', msg, ctx, escopo),
    warn: (msg, ctx) => emitir('warn', msg, ctx, escopo),
    error: (msg, ctx) => emitir('error', msg, ctx, escopo),
    debug: (msg, ctx) => emitir('debug', msg, ctx, escopo),
    /** Deriva um sub-logger com escopo aninhado. */
    com: (sub) => criarLogger(escopo ? `${escopo}:${sub}` : sub),
  };
}

module.exports = {
  criarLogger,
  redagir,
  mascararCpf,
  mascararPis,
  mascararDocumento,
};
