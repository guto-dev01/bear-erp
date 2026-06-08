'use strict';

const { el } = require('../xml');
const { LOTE } = require('../namespaces');

/**
 * Monta o XML de envio de lote de eventos (envioLoteEventos).
 *
 * Regras (Parte 3):
 *  - Entre 1 e 50 eventos por lote.
 *  - `grupo`: 1 = eventos iniciais/tabelas/não-periódicos; 2 = periódicos. A
 *    indicação errada rejeita o lote.
 *  - Cada evento já vem ASSINADO (XML <eSocial>…</eSocial> com <Signature>).
 *
 * @param {object} p
 * @param {1|2} p.grupo
 * @param {{ tpInsc: number, nrInsc: string }} p.ideEmpregador
 * @param {{ tpInsc: number, nrInsc: string }} p.ideTransmissor
 * @param {{ id: string, xmlAssinado: string }[]} p.eventos
 * @param {object} [opts]
 * @param {string} [opts.nsOverride]
 * @returns {string} XML do lote
 */
function montarLote({ grupo, ideEmpregador, ideTransmissor, eventos }, opts = {}) {
  if (grupo !== 1 && grupo !== 2) throw new Error('grupo deve ser 1 ou 2');
  if (!Array.isArray(eventos) || eventos.length < 1) {
    throw new Error('lote precisa de ao menos 1 evento');
  }
  if (eventos.length > 50) {
    throw new Error(`lote excede o limite de 50 eventos (${eventos.length})`);
  }
  for (const ev of eventos) {
    if (!ev.id || !ev.xmlAssinado) throw new Error('evento sem id/xmlAssinado');
    if (!/<\w*:?Signature/.test(ev.xmlAssinado)) {
      throw new Error(`evento ${ev.id} não está assinado`);
    }
  }
  validarInsc(ideEmpregador, 'ideEmpregador');
  validarInsc(ideTransmissor, 'ideTransmissor');

  const ns = opts.nsOverride || LOTE.envio;

  const eventosXml = eventos
    .map((ev) => `<evento Id="${ev.id}">${ev.xmlAssinado}</evento>`)
    .join('');

  const corpo = el('envioLoteEventos', { grupo }, [
    el('ideEmpregador', [
      el('tpInsc', ideEmpregador.tpInsc),
      el('nrInsc', String(ideEmpregador.nrInsc).replace(/\D/g, '')),
    ]),
    el('ideTransmissor', [
      el('tpInsc', ideTransmissor.tpInsc),
      el('nrInsc', String(ideTransmissor.nrInsc).replace(/\D/g, '')),
    ]),
    // eventos já são XML montado/assinado — entram como fragmento.
    el('eventos', [eventosXml]),
  ]);

  return `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
}

function validarInsc(ide, nome) {
  if (!ide || (ide.tpInsc !== 1 && ide.tpInsc !== 2) || !ide.nrInsc) {
    throw new Error(`${nome} inválido (tpInsc 1|2 e nrInsc obrigatórios)`);
  }
}

module.exports = { montarLote };
