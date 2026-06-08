'use strict';

/**
 * Geração do Id do evento eSocial.
 *
 * Formato oficial (36 caracteres):
 *   "ID" + tpInsc(1) + nrInsc(14) + aaaammddhhmmss(14) + sequencial(5)
 *
 * - tpInsc: 1=CNPJ, 2=CPF.
 * - nrInsc: SEMPRE 14 posições. Para CNPJ com 8 (raiz) ou 11, completa-se com
 *   zeros à direita até 14 (regra do MOD).
 * - timestamp: data/hora de geração (UTC-3 / horário de Brasília na prática; o
 *   relógio do servidor deve estar correto). Recebido por injeção para ser
 *   determinístico em teste.
 * - sequencial: 00001..99999 dentro do mesmo segundo.
 */

function pad(valor, tamanho, dir = 'start') {
  const s = String(valor);
  return dir === 'start' ? s.padStart(tamanho, '0') : s.padEnd(tamanho, '0');
}

/** Formata Date como aaaammddhhmmss (componentes locais do servidor). */
function carimboData(data) {
  return (
    pad(data.getFullYear(), 4) +
    pad(data.getMonth() + 1, 2) +
    pad(data.getDate(), 2) +
    pad(data.getHours(), 2) +
    pad(data.getMinutes(), 2) +
    pad(data.getSeconds(), 2)
  );
}

/**
 * @param {object} p
 * @param {number} p.tpInsc        1=CNPJ, 2=CPF
 * @param {string} p.nrInsc        só dígitos (8, 11 ou 14)
 * @param {Date}   p.data          momento de geração
 * @param {number} [p.sequencial=1]
 * @returns {string} Id de 36 caracteres
 */
function gerarId({ tpInsc, nrInsc, data, sequencial = 1 }) {
  if (tpInsc !== 1 && tpInsc !== 2) throw new Error('tpInsc deve ser 1 (CNPJ) ou 2 (CPF)');
  const digitos = String(nrInsc).replace(/\D/g, '');
  if (!digitos) throw new Error('nrInsc inválido');
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) throw new Error('data inválida');
  if (sequencial < 1 || sequencial > 99999) throw new Error('sequencial fora de 1..99999');

  const nrInsc14 = pad(digitos, 14, 'end').slice(0, 14);
  const id = `ID${tpInsc}${nrInsc14}${carimboData(data)}${pad(sequencial, 5)}`;
  if (id.length !== 36) throw new Error(`Id gerado com tamanho inesperado: ${id.length}`);
  return id;
}

module.exports = { gerarId, carimboData };
