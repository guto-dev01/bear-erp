'use strict';

/**
 * Máquina de estado da transmissão de um evento/lote ao eSocial + idempotência.
 *
 * Persistido em `eventos_esocial.status`. Transições válidas:
 *
 *   RASCUNHO ─▶ VALIDADO ─▶ ASSINADO ─▶ ENVIADO ─▶ PROCESSANDO ─▶ ACEITO
 *                                                              └─▶ REJEITADO
 *   (REJEITADO e ERRO podem voltar a RASCUNHO para correção e reenvio)
 *
 * Idempotência (Parte 4): o `idEvento` é único e estável; um reenvio de lote já
 * recebido deve ser detectado pelo recibo, não reprocessado. `podeEnviar()`
 * impede transmitir o que já está em voo ou aceito.
 */

const ESTADO = Object.freeze({
  RASCUNHO: 'RASCUNHO',
  VALIDADO: 'VALIDADO',
  ASSINADO: 'ASSINADO',
  ENVIADO: 'ENVIADO',
  PROCESSANDO: 'PROCESSANDO',
  ACEITO: 'ACEITO',
  REJEITADO: 'REJEITADO',
  ERRO: 'ERRO',
});

const TRANSICOES = Object.freeze({
  RASCUNHO: ['VALIDADO', 'ERRO'],
  VALIDADO: ['ASSINADO', 'RASCUNHO', 'ERRO'],
  ASSINADO: ['ENVIADO', 'RASCUNHO', 'ERRO'],
  ENVIADO: ['PROCESSANDO', 'ACEITO', 'REJEITADO', 'ERRO'],
  PROCESSANDO: ['ACEITO', 'REJEITADO', 'ERRO'],
  REJEITADO: ['RASCUNHO'],
  ERRO: ['RASCUNHO'],
  ACEITO: [], // terminal
});

/** Estados a partir dos quais NÃO se deve transmitir de novo. */
const EM_VOO_OU_FINAL = new Set([ESTADO.ENVIADO, ESTADO.PROCESSANDO, ESTADO.ACEITO]);

function podeTransicionar(de, para) {
  return (TRANSICOES[de] || []).includes(para);
}

function transicionar(de, para) {
  if (!podeTransicionar(de, para)) {
    throw new Error(`Transição inválida: ${de} → ${para}`);
  }
  return para;
}

function podeEnviar(estado) {
  return !EM_VOO_OU_FINAL.has(estado);
}

/**
 * Traduz o código de resposta do processamento de lote do eSocial para um
 * estado interno. Faixas conforme o MOD (confirmar no leiaute vigente):
 *  - 201/202  → lote recebido / em processamento
 *  - 1xx (sucesso) por evento → ACEITO
 *  - 2xx de advertência ainda processa
 *  - >= 300 ou rejeições → REJEITADO
 *
 * @param {number} cdResposta
 * @returns {string} ESTADO.*
 */
function estadoPorCodigoLote(cdResposta) {
  const c = Number(cdResposta);
  if (c === 201) return ESTADO.PROCESSANDO; // recebido, aguardando
  if (c === 202) return ESTADO.PROCESSANDO; // em processamento
  if (c >= 200 && c < 300) return ESTADO.PROCESSANDO;
  if (c >= 300) return ESTADO.REJEITADO;
  return ESTADO.ERRO;
}

module.exports = {
  ESTADO,
  TRANSICOES,
  podeTransicionar,
  transicionar,
  podeEnviar,
  estadoPorCodigoLote,
};
