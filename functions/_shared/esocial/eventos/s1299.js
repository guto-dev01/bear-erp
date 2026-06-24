'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-1299 — Fechamento dos Eventos Periódicos (evento PERIÓDICO, grupo 2).
 * É o último evento do movimento mensal: declara que a folha do período está
 * encerrada e dispara a apuração (DCTFWeb/totalizadores S-5011). Deve ser
 * enviado após todos os S-1200/S-1210 do período.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtFechaEvPer antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente. `compSemMovto` é
 * usado para declarar ausência de movimento (sem folha) no período.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois pelo motor.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb
 * @param {number} [dados.procEmi=1]
 * @param {string} [dados.verProc='BearERP']
 * @param {number} dados.indApuracao          1=mensal, 2=anual (13º)
 * @param {string} dados.perApur              'aaaa-mm' ou 'aaaa'
 * @param {number} dados.tpInsc
 * @param {string} dados.nrInsc
 * @param {object} dados.ideRespInf           { nmResp, cpfResp, telefone?, email? }
 * @param {object} dados.infoFech             flags S/N de cada grupo de eventos
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS1299(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtFechaEvPer';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const ri = dados.ideRespInf;
  const f = dados.infoFech;
  const corpo = el(alias, { Id: id }, [
    el('ideEvento', [
      el('indApuracao', dados.indApuracao),
      el('perApur', dados.perApur),
      el('tpAmb', dados.tpAmb),
      el('procEmi', dados.procEmi ?? 1),
      el('verProc', dados.verProc ?? 'BearERP'),
    ]),
    el('ideEmpregador', [
      el('tpInsc', dados.tpInsc),
      el('nrInsc', soDigitos(dados.nrInsc)),
    ]),
    el('ideRespInf', [
      el('nmResp', ri.nmResp),
      el('cpfResp', soDigitos(ri.cpfResp)),
      el('telefone', ri.telefone ? soDigitos(ri.telefone) : undefined),
      el('email', ri.email),
    ]),
    el('infoFech', [
      el('evtRemun', f.evtRemun),
      el('evtPgtos', f.evtPgtos),
      el('evtAqProd', f.evtAqProd),
      el('evtComProd', f.evtComProd),
      el('evtContratAvNP', f.evtContratAvNP),
      el('evtInfoComplPer', f.evtInfoComplPer),
      el('compSemMovto', f.compSemMovto),
    ]),
  ]);

  const xml = `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
  return { id, xml, alias };
}

function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function validar(d) {
  const faltando = [];
  if (d.tpAmb !== 1 && d.tpAmb !== 2) faltando.push('tpAmb (1|2)');
  if (![1, 2].includes(Number(d.indApuracao))) faltando.push('indApuracao (1=mensal|2=anual)');
  if (Number(d.indApuracao) === 2) {
    if (!/^\d{4}$/.test(String(d.perApur))) faltando.push('perApur (aaaa, apuração anual)');
  } else if (!/^\d{4}-\d{2}$/.test(String(d.perApur))) {
    faltando.push('perApur (aaaa-mm)');
  }
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  const ri = d.ideRespInf;
  if (!ri) faltando.push('ideRespInf');
  else {
    if (!ri.nmResp) faltando.push('ideRespInf.nmResp');
    if (!ri.cpfResp) faltando.push('ideRespInf.cpfResp');
    else if (soDigitos(ri.cpfResp).length !== 11) faltando.push('ideRespInf.cpfResp (11 dígitos)');
  }

  const f = d.infoFech;
  if (!f) faltando.push('infoFech');
  else {
    if (!ehSimNao(f.evtRemun)) faltando.push('infoFech.evtRemun (S|N)');
    if (!ehSimNao(f.evtPgtos)) faltando.push('infoFech.evtPgtos (S|N)');
  }

  if (faltando.length) {
    throw new Error(`S-1299 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehSimNao(v) {
  return v === 'S' || v === 'N';
}

module.exports = { montarS1299 };
