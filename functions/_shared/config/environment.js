'use strict';

/**
 * Chaveamento de ambiente do eSocial — produção restrita x produção.
 *
 * Tudo vem de variáveis de ambiente (Parte 4: "configuração por ambiente, sem
 * recompilar"). Nada de endpoint hardcoded por build. O padrão é SEMPRE
 * produção restrita, para que um deploy sem configuração explícita nunca
 * transmita para o ambiente real do governo por acidente.
 *
 * tpAmb segue a convenção do próprio eSocial usada no XML dos eventos:
 *   1 = Produção
 *   2 = Produção Restrita (testes/homologação)
 */

const AMBIENTE = Object.freeze({
  PRODUCAO: 1,
  PRODUCAO_RESTRITA: 2,
});

const NOME_AMBIENTE = Object.freeze({
  [AMBIENTE.PRODUCAO]: 'producao',
  [AMBIENTE.PRODUCAO_RESTRITA]: 'producao-restrita',
});

// Caminhos dos WebServices são idênticos entre os ambientes; muda só o host.
const HOST = Object.freeze({
  [AMBIENTE.PRODUCAO]: 'webservices.esocial.gov.br',
  [AMBIENTE.PRODUCAO_RESTRITA]: 'webservices.producaorestrita.esocial.gov.br',
});

const CAMINHO = Object.freeze({
  enviarLote:
    '/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
  consultarLote:
    '/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc',
});

function endpointsPara(ambiente) {
  const host = HOST[ambiente];
  return Object.freeze({
    enviarLote: `https://${host}${CAMINHO.enviarLote}`,
    consultarLote: `https://${host}${CAMINHO.consultarLote}`,
  });
}

/**
 * Resolve o ambiente a partir do env, aceitando número (1/2) ou nome
 * ('producao' / 'producao-restrita'). Default seguro: produção restrita.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number} AMBIENTE.PRODUCAO | AMBIENTE.PRODUCAO_RESTRITA
 */
function resolverAmbiente(env = process.env) {
  const bruto = (env.ESOCIAL_AMBIENTE ?? '').toString().trim().toLowerCase();
  if (bruto === '1' || bruto === 'producao' || bruto === 'produção') {
    return AMBIENTE.PRODUCAO;
  }
  // Qualquer outro valor (inclusive vazio/desconhecido) → restrita.
  return AMBIENTE.PRODUCAO_RESTRITA;
}

/**
 * Configuração efetiva do eSocial para o ambiente corrente.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{
 *   ambiente: number,
 *   ambienteNome: string,
 *   tpAmb: number,
 *   producao: boolean,
 *   endpoints: { enviarLote: string, consultarLote: string },
 *   versaoLeiaute: string,
 *   diasAlertaCertificado: number,
 * }}
 */
function getConfig(env = process.env) {
  const ambiente = resolverAmbiente(env);
  const versaoLeiaute = (env.ESOCIAL_VERSAO_LEIAUTE || 'S-1.3').trim();
  const diasAlertaCertificado = Number.parseInt(
    env.CERT_DIAS_ALERTA_VENCIMENTO || '30',
    10,
  );
  return Object.freeze({
    ambiente,
    ambienteNome: NOME_AMBIENTE[ambiente],
    tpAmb: ambiente, // 1 ou 2 — mesma convenção do XML do eSocial
    producao: ambiente === AMBIENTE.PRODUCAO,
    endpoints: endpointsPara(ambiente),
    versaoLeiaute,
    diasAlertaCertificado: Number.isFinite(diasAlertaCertificado)
      ? diasAlertaCertificado
      : 30,
  });
}

module.exports = {
  AMBIENTE,
  NOME_AMBIENTE,
  resolverAmbiente,
  endpointsPara,
  getConfig,
};
