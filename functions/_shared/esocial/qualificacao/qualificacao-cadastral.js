'use strict';

/**
 * Qualificação Cadastral do eSocial — valida a consistência de CPF × NIS/PIS ×
 * NOME do trabalhador ANTES de transmitir eventos (S-2200 etc.). Cadastro
 * divergente é a maior causa de rejeição de admissão no eSocial.
 *
 * Há DUAS camadas:
 *
 *  1) `qualificarLocal()` — pré-validação determinística (dígitos verificadores
 *     de CPF e NIS, consistência do nome). Porta as regras de referência do
 *     legado Java (EsocialPainelService.qualificarCadastro / validarCpf) e as
 *     reforça com o dígito verificador do NIS/PIS. NÃO consulta a base do
 *     governo — só pega erros de digitação/formato.
 *
 *  2) `consultarOficial()` — consulta o serviço OFICIAL de Qualificação
 *     Cadastral (CNIS/CPF) do eSocial, que confronta CPF×NIS×nome×nascimento
 *     contra as bases da Receita/INSS. É a fonte da verdade.
 *
 *     >>> PENDENTE DE CONFIGURAÇÃO EXTERNA <<<
 *     O endpoint/credencial do webservice oficial ainda NÃO está disponível
 *     neste ambiente. `consultarOficial()` exige `ESOCIAL_QUALIF_WS_URL` (e o
 *     material de certificado para mTLS quando o serviço exigir); sem isso ela
 *     lança erro `PENDENTE_CONFIG` em vez de fingir sucesso. Quando o acesso for
 *     liberado, implementar aqui o envelope/parser do WS conforme o WSDL
 *     vigente — confirmar nome da operação e namespaces no manual oficial.
 *
 * Nenhuma destas funções transmite em import — apenas quando chamadas.
 */

/** Valida o CPF pelos dígitos verificadores (porta de validarCpf do Java). */
function validarCpf(cpf) {
  const limpo = soDigitos(cpf);
  if (limpo.length !== 11) return false;
  // Rejeita sequências repetidas (000..., 111...): inválidas apesar do DV bater.
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  const dv = (base, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const r = 11 - (soma % 11);
    return r > 9 ? 0 : r;
  };
  const d1 = dv(limpo.slice(0, 9), 10);
  const d2 = dv(limpo.slice(0, 10), 11);
  return Number(limpo[9]) === d1 && Number(limpo[10]) === d2;
}

/**
 * Valida o NIS/PIS/PASEP/NIT: 11 dígitos + dígito verificador (módulo 11 com
 * pesos 3,2,9,8,7,6,5,4,3,2). O legado Java só checava o comprimento; aqui
 * reforçamos com o DV padrão (algoritmo determinístico, não inventado).
 */
function validarNis(nis) {
  const limpo = soDigitos(nis);
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(limpo[i]) * pesos[i];
  const r = soma % 11;
  const dv = r < 2 ? 0 : 11 - r;
  return Number(limpo[10]) === dv;
}

/** Nome consistente: ≥5 chars, ≥2 partes, sem dígitos/símbolos (regra do Java). */
function nomeConsistente(nome) {
  if (typeof nome !== 'string') return false;
  const t = nome.trim();
  if (t.length < 5 || !t.includes(' ')) return false;
  if (/[0-9@#$%&*]/.test(t)) return false;
  return true;
}

/**
 * Pré-validação local de qualificação cadastral. Mesma forma de retorno do
 * ResultadoQualificacao do legado Java.
 *
 * @param {object} p
 * @param {string} p.cpf
 * @param {string} p.nome
 * @param {string} p.nis
 * @returns {{ cpf, nome, nis, cpfValido, nisValido, nomeConsistente, qualificado, divergencias: string[], recomendacao: string }}
 */
function qualificarLocal({ cpf, nome, nis } = {}) {
  const divergencias = [];

  const cpfValido = validarCpf(cpf);
  if (!cpfValido) divergencias.push('CPF inválido (dígitos verificadores não conferem)');

  const nisValido = validarNis(nis);
  if (!nisValido) divergencias.push('NIS/PIS inválido — 11 dígitos com dígito verificador correto');

  const nomeOk = nomeConsistente(nome);
  if (!nomeOk) divergencias.push('Nome incompleto ou com caracteres inválidos — informar nome completo conforme documento');

  const qualificado = cpfValido && nisValido && nomeOk;
  const recomendacao = qualificado
    ? 'Pré-validação OK — apto para envio ao eSocial. Recomenda-se confirmar na Qualificação Cadastral oficial.'
    : 'Cadastro com divergências — corrigir antes de enviar eventos ao eSocial. Utilize a Qualificação Cadastral oficial do eSocial para validação definitiva.';

  return {
    cpf: cpf ? soDigitos(cpf) : cpf,
    nome,
    nis: nis ? soDigitos(nis) : nis,
    cpfValido,
    nisValido,
    nomeConsistente: nomeOk,
    qualificado,
    divergencias,
    recomendacao,
  };
}

/**
 * Consulta o serviço OFICIAL de Qualificação Cadastral do eSocial.
 *
 * PENDENTE: enquanto `ESOCIAL_QUALIF_WS_URL` não estiver configurado, lança
 * `PENDENTE_CONFIG` — NÃO simula sucesso. O contrato de entrada/saída fica
 * definido aqui para a implementação ser plugada quando o acesso for liberado.
 *
 * @param {object} p
 * @param {string} p.cpf
 * @param {string} p.nome
 * @param {string} p.nis
 * @param {string} [p.dtNascto]              'aaaa-mm-dd' (o WS oficial exige)
 * @param {object} [p.material]              certificado p/ mTLS, quando exigido
 * @param {object} [p.env=process.env]
 * @param {object} [p.httpsModule]           injeção p/ teste
 * @returns {Promise<object>}
 */
async function consultarOficial({ env = process.env } = {}) {
  const url = env.ESOCIAL_QUALIF_WS_URL;
  if (!url) {
    const err = new Error(
      'Qualificação Cadastral oficial indisponível: configure ESOCIAL_QUALIF_WS_URL ' +
        '(endpoint/WSDL do webservice de Consulta Qualificação Cadastral) e o material ' +
        'de certificado para mTLS. Acesso ao serviço oficial ainda pendente de habilitação.',
    );
    err.codigo = 'PENDENTE_CONFIG';
    throw err;
  }
  // TODO(integração oficial): montar o envelope SOAP/REST conforme o WSDL vigente,
  // assinar/transportar via mTLS (reaproveitar soap/cliente-soap.js) e parsear o
  // retorno (situação do CPF, do NIS e do nome). Confirmar operação e namespaces
  // no manual oficial antes de ativar.
  const err = new Error('Implementação do webservice oficial pendente (WSDL/credencial).');
  err.codigo = 'PENDENTE_IMPL';
  throw err;
}

function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

module.exports = {
  validarCpf,
  validarNis,
  nomeConsistente,
  qualificarLocal,
  consultarOficial,
};
