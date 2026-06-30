'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-1210 — Pagamentos de Rendimentos do Trabalho (evento PERIÓDICO,
 * grupo 2). Informa os pagamentos efetivamente realizados aos beneficiários,
 * referenciando os demonstrativos da remuneração (S-1200) ou do desligamento
 * (S-2299). Base da DIRF/comprovante de rendimentos.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtPgtos antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente. Modelamos o NÚCLEO
 * (ideBenef → infoPgto) e o detalhamento detPgtoFl/detPgtoBenPr/retPgtoTot fica
 * como extensão futura quando o XSD for incorporado.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois pelo motor.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb
 * @param {number} [dados.procEmi=1]
 * @param {string} [dados.verProc='BearERP']
 * @param {number} [dados.indRetif=1]
 * @param {string} [dados.nrRecibo]           obrigatório quando indRetif=2
 * @param {number} dados.indApuracao          1=mensal, 2=anual (13º)
 * @param {string} dados.perApur              'aaaa-mm' ou 'aaaa'
 * @param {number} dados.tpInsc
 * @param {string} dados.nrInsc
 * @param {object[]} dados.ideBenef           beneficiários (1..N)
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS1210(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtPgtos';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const corpo = el(alias, { Id: id }, [
    el('ideEvento', [
      el('indRetif', dados.indRetif ?? 1),
      el('nrRecibo', dados.indRetif === 2 ? dados.nrRecibo : undefined),
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
    ...dados.ideBenef.map((b) => blocoIdeBenef(b)),
  ]);

  const xml = `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
  return { id, xml, alias };
}

/** Beneficiário (ideBenef) com seus pagamentos. */
function blocoIdeBenef(b) {
  const pgtos = b.infoPgto || [];
  return el('ideBenef', [
    el('cpfBenef', soDigitos(b.cpfBenef)),
    ...pgtos.map((p) =>
      el('infoPgto', [
        el('dtPgto', p.dtPgto),
        el('tpPgto', p.tpPgto),
        el('perRef', p.perRef),
        el('ideDmDev', p.ideDmDev),
        el('vrLiq', p.vrLiq),
        // paisResidExt só para beneficiário residente no exterior.
        el('paisResidExt', p.paisResidExt),
      ]),
    ),
  ]);
}

function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function validar(d) {
  const faltando = [];
  if (d.tpAmb !== 1 && d.tpAmb !== 2) faltando.push('tpAmb (1|2)');
  if (d.indRetif === 2 && !d.nrRecibo) faltando.push('nrRecibo (obrigatório quando indRetif=2)');
  if (![1, 2].includes(Number(d.indApuracao))) faltando.push('indApuracao (1=mensal|2=anual)');
  if (Number(d.indApuracao) === 2) {
    if (!/^\d{4}$/.test(String(d.perApur))) faltando.push('perApur (aaaa, apuração anual)');
  } else if (!/^\d{4}-\d{2}$/.test(String(d.perApur))) {
    faltando.push('perApur (aaaa-mm)');
  }
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  const benefs = d.ideBenef || [];
  if (!benefs.length) faltando.push('ideBenef (≥1)');
  benefs.forEach((b, i) => {
    if (!b.cpfBenef) faltando.push(`ideBenef[${i}].cpfBenef`);
    else if (soDigitos(b.cpfBenef).length !== 11) faltando.push(`ideBenef[${i}].cpfBenef (11 dígitos)`);
    const pgtos = b.infoPgto || [];
    if (!pgtos.length) faltando.push(`ideBenef[${i}].infoPgto (≥1)`);
    pgtos.forEach((p, j) => {
      if (!ehData(p.dtPgto)) faltando.push(`ideBenef[${i}].infoPgto[${j}].dtPgto (aaaa-mm-dd)`);
      if (!p.tpPgto) faltando.push(`ideBenef[${i}].infoPgto[${j}].tpPgto`);
      if (p.vrLiq == null) faltando.push(`ideBenef[${i}].infoPgto[${j}].vrLiq`);
    });
  });

  if (faltando.length) {
    throw new Error(`S-1210 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

module.exports = { montarS1210 };
