'use strict';

/**
 * Consulta de dados de pessoa física por CPF via Hub do Desenvolvedor.
 *
 * Camada pura (sem Appwrite, sem env): recebe token + httpClient injetados e
 * devolve um resultado normalizado. Toda a I/O é injetável para permitir teste
 * offline (sem rede). A Function `consulta-cpf-hub/index.js` é só a casca que
 * lê env e delega aqui — mesmo padrão das functions do eSocial.
 *
 * Segurança (Parte 0 / LGPD): o token NUNCA chega ao navegador. Esta consulta
 * roda server-side (Appwrite Function); o frontend só envia o CPF e recebe os
 * dados já normalizados. O logger de `_shared/log` mascara CPF automaticamente.
 *
 * Contrato Hub do Desenvolvedor (v2):
 *   GET {base}?cpf={cpf}&data={dd/mm/aaaa}&token={token}
 *   200 OK, corpo JSON:
 *     { "status": true, "return": "OK", "result": { ... } }
 *     { "status": false, "return": "NOK", "message": "..." }   (erro lógico)
 *
 * O endpoint e os nomes de campo do Hub podem variar por plano/versão, então a
 * normalização é defensiva (tenta vários nomes) e o payload bruto é sempre
 * preservado em `bruto` para não quebrar quando o schema mudar.
 */

const URL_PADRAO = 'https://ws.hubdodesenvolvedor.com.br/v2/cpf/';

/** Mantém só dígitos. */
function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

/**
 * Validação dos dígitos verificadores do CPF (algoritmo da Receita).
 * @param {string} cpf 11 dígitos
 * @returns {boolean}
 */
function cpfValido(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // todos iguais
  const dv = (base, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const dig1 = dv(d.slice(0, 9), 10);
  const dig2 = dv(d.slice(0, 10), 11);
  return dig1 === Number(d[9]) && dig2 === Number(d[10]);
}

/**
 * Converte data BR (dd/mm/aaaa) para ISO (aaaa-mm-dd) quando possível, para
 * preencher inputs `type="date"` no Angular. Retorna o original se não casar.
 * @param {string} valor
 * @returns {string}
 */
function dataParaIso(valor) {
  const txt = String(valor ?? '').trim();
  const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return txt;
}

/** Primeiro valor não-vazio entre as chaves candidatas de um objeto. */
function primeiroDe(obj, chaves) {
  for (const c of chaves) {
    const v = obj?.[c];
    if (v != null && String(v).trim() !== '') return v;
  }
  return undefined;
}

/**
 * Normaliza o `result` do Hub para um formato estável consumido pelo frontend.
 * Tenta múltiplos nomes de campo porque o Hub varia conforme o plano.
 * @param {Record<string, any>} result
 */
function normalizarResultado(result) {
  if (!result || typeof result !== 'object') return {};
  const dataNasc = primeiroDe(result, ['data_nascimento', 'nascimento', 'dataNascimento']);
  return {
    cpf: somenteDigitos(primeiroDe(result, ['numero_de_cpf', 'cpf', 'numeroDeCpf'])),
    nome: primeiroDe(result, ['nome_da_pf', 'nome', 'nomeDaPf', 'name']),
    dataNascimento: dataNasc != null ? dataParaIso(dataNasc) : undefined,
    situacaoCadastral: primeiroDe(result, ['situacao_cadastral', 'situacao', 'situacaoCadastral']),
    dataInscricao: primeiroDe(result, ['data_inscricao', 'dataInscricao']),
    genero: primeiroDe(result, ['genero', 'sexo', 'gender']),
    nomeMae: primeiroDe(result, ['nome_mae', 'mae', 'nomeMae']),
  };
}

/**
 * Consulta o CPF no Hub do Desenvolvedor.
 *
 * @param {object} params
 * @param {string} params.cpf                         CPF (com ou sem máscara)
 * @param {string} params.token                       token do Hub
 * @param {string} [params.dataNascimento]            data de nascimento (opcional;
 *   exigida por alguns planos). Aceita dd/mm/aaaa ou aaaa-mm-dd.
 * @param {string} [params.url]                        endpoint base (default Hub v2)
 * @param {(url: string) => Promise<{ ok: boolean, status: number, json: () => Promise<any> }>} [params.httpClient]
 *   injetável p/ teste; default = fetch global.
 * @returns {Promise<{ cpf: string, normalizado: object, bruto: any }>}
 * @throws {Error} CPF inválido, token ausente, falha de rede ou retorno NOK do Hub.
 */
async function consultarCpf({ cpf, token, dataNascimento, url = URL_PADRAO, httpClient } = {}) {
  const cpfLimpo = somenteDigitos(cpf);
  if (!cpfValido(cpfLimpo)) {
    const erro = new Error('CPF inválido');
    erro.codigo = 'CPF_INVALIDO';
    throw erro;
  }
  if (!token) {
    const erro = new Error('Token do Hub não configurado (CPF_API_TOKEN)');
    erro.codigo = 'TOKEN_AUSENTE';
    throw erro;
  }

  const fetchFn = httpClient || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) throw new Error('httpClient indisponível (fetch não encontrado)');

  const params = new URLSearchParams({ cpf: cpfLimpo, token });
  const dataIso = somenteDigitos(dataNascimento).length === 8 || dataNascimento
    ? dataParaIso(dataNascimento)
    : '';
  if (dataIso) {
    // Hub espera dd/mm/aaaa.
    const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    params.set('data', m ? `${m[3]}/${m[2]}/${m[1]}` : String(dataNascimento));
  }

  const alvo = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;

  let resposta;
  try {
    resposta = await fetchFn(alvo, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch (e) {
    const erro = new Error(`Falha de rede ao consultar o Hub: ${e.message}`);
    erro.codigo = 'REDE';
    throw erro;
  }

  if (!resposta.ok) {
    const erro = new Error(`Hub respondeu HTTP ${resposta.status}`);
    erro.codigo = 'HTTP';
    erro.httpStatus = resposta.status;
    throw erro;
  }

  let corpo;
  try {
    corpo = await resposta.json();
  } catch {
    const erro = new Error('Resposta do Hub não é JSON válido');
    erro.codigo = 'JSON_INVALIDO';
    throw erro;
  }

  // Erro lógico do Hub: status=false / return!=OK.
  const ok = corpo?.status === true || /^ok$/i.test(String(corpo?.return ?? ''));
  if (!ok) {
    const msg = corpo?.message || corpo?.return || 'CPF não encontrado';
    const erro = new Error(String(msg));
    erro.codigo = 'NAO_ENCONTRADO';
    throw erro;
  }

  const result = corpo.result ?? corpo.data ?? corpo;
  return {
    cpf: cpfLimpo,
    normalizado: normalizarResultado(result),
    bruto: result,
  };
}

module.exports = {
  consultarCpf,
  normalizarResultado,
  cpfValido,
  somenteDigitos,
  dataParaIso,
  URL_PADRAO,
};
