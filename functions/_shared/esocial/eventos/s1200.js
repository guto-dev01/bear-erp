'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-1200 — Remuneração de Trabalhador vinculado ao RGPS (evento
 * PERIÓDICO, grupo 2). Informa as rubricas pagas a cada trabalhador no período
 * de apuração. Depende das rubricas (S-1010) e do vínculo (S-2200).
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtRemun antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD (XSD fica como pendência).
 *
 * Campos opcionais ausentes são omitidos automaticamente. O leiaute do S-1200 é
 * extenso (infoComplem, infoInterm, infoComplCont, infoTrabIntermitente,
 * procJudTrab, infoTrabImig etc.); aqui modelamos o NÚCLEO obrigatório
 * (dmDev → ideEstabLot → remunPerApur → itensRemun) e deixamos os blocos
 * acessórios como extensão futura quando o XSD for incorporado.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois pelo motor.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb
 * @param {number} [dados.procEmi=1]
 * @param {string} [dados.verProc='BearERP']
 * @param {number} [dados.indRetif=1]         1=original, 2=retificação
 * @param {string} [dados.nrRecibo]           obrigatório quando indRetif=2
 * @param {number} dados.indApuracao          1=mensal, 2=anual (13º)
 * @param {string} dados.perApur              'aaaa-mm' (mensal) ou 'aaaa' (anual)
 * @param {number} dados.tpInsc
 * @param {string} dados.nrInsc
 * @param {object} dados.ideTrabalhador       { cpfTrab, infoComplem?, ... }
 * @param {object[]} dados.dmDev              demonstrativos (1..N)
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS1200(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtRemun';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const it = dados.ideTrabalhador;
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
    el('ideTrabalhador', [
      el('cpfTrab', soDigitos(it.cpfTrab)),
      // infoComplem (0..1) — exigido p/ 1ª declaração do trabalhador no período.
      it.infoComplem
        ? el('infoComplem', [
            el('nmTrab', it.infoComplem.nmTrab),
            el('dtNascto', it.infoComplem.dtNascto),
          ])
        : undefined,
    ]),
    ...dados.dmDev.map((dm) => blocoDmDev(dm)),
  ]);

  const xml = `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
  return { id, xml, alias };
}

/** Demonstrativo de valores devidos (dmDev). */
function blocoDmDev(dm) {
  const estabs = dm.ideEstabLot || [];
  return el('dmDev', [
    el('ideDmDev', dm.ideDmDev),
    el('codCateg', dm.codCateg),
    el('infoPerApur', [...estabs.map((e) => blocoIdeEstabLot(e))]),
  ]);
}

/** Estabelecimento/lotação (ideEstabLot) com suas remunerações. */
function blocoIdeEstabLot(e) {
  const remuns = e.remunPerApur || [];
  return el('ideEstabLot', [
    el('tpInsc', e.tpInsc),
    el('nrInsc', soDigitos(e.nrInsc)),
    el('codLotacao', e.codLotacao),
    ...remuns.map((r) => blocoRemunPerApur(r)),
  ]);
}

/** Remuneração na lotação (remunPerApur) → itens de rubrica. */
function blocoRemunPerApur(r) {
  const itens = r.itensRemun || [];
  return el('remunPerApur', [
    el('matricula', r.matricula),
    el('indSimples', r.indSimples),
    ...itens.map((i) =>
      el('itensRemun', [
        el('codRubr', i.codRubr),
        el('ideTabRubr', i.ideTabRubr),
        el('qtdRubr', i.qtdRubr),
        el('fatorRubr', i.fatorRubr),
        el('vrUnit', i.vrUnit),
        el('vrRubr', i.vrRubr),
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

  if (!d.ideTrabalhador || !d.ideTrabalhador.cpfTrab) faltando.push('ideTrabalhador.cpfTrab');
  else if (soDigitos(d.ideTrabalhador.cpfTrab).length !== 11) faltando.push('ideTrabalhador.cpfTrab (11 dígitos)');

  const dmDev = d.dmDev || [];
  if (!dmDev.length) faltando.push('dmDev (≥1)');
  dmDev.forEach((dm, i) => {
    if (!dm.ideDmDev) faltando.push(`dmDev[${i}].ideDmDev`);
    if (!dm.codCateg) faltando.push(`dmDev[${i}].codCateg`);
    const estabs = dm.ideEstabLot || [];
    if (!estabs.length) faltando.push(`dmDev[${i}].ideEstabLot (≥1)`);
    estabs.forEach((e, j) => {
      if (e.tpInsc == null) faltando.push(`dmDev[${i}].ideEstabLot[${j}].tpInsc`);
      if (!e.nrInsc) faltando.push(`dmDev[${i}].ideEstabLot[${j}].nrInsc`);
      if (!e.codLotacao) faltando.push(`dmDev[${i}].ideEstabLot[${j}].codLotacao`);
      const remuns = e.remunPerApur || [];
      if (!remuns.length) faltando.push(`dmDev[${i}].ideEstabLot[${j}].remunPerApur (≥1)`);
      remuns.forEach((r, k) => {
        const itens = r.itensRemun || [];
        if (!itens.length) faltando.push(`dmDev[${i}].ideEstabLot[${j}].remunPerApur[${k}].itensRemun (≥1)`);
        itens.forEach((item, l) => {
          if (!item.codRubr) faltando.push(`itensRemun[${i}.${j}.${k}.${l}].codRubr`);
          if (!item.ideTabRubr) faltando.push(`itensRemun[${i}.${j}.${k}.${l}].ideTabRubr`);
          if (item.vrRubr == null) faltando.push(`itensRemun[${i}.${j}.${k}.${l}].vrRubr`);
        });
      });
    });
  });

  if (faltando.length) {
    throw new Error(`S-1200 inválido — campos: ${faltando.join(', ')}`);
  }
}

module.exports = { montarS1200 };
