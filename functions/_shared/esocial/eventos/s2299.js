'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-2299 — Desligamento (evento NÃO PERIÓDICO, grupo 2). Encerra o
 * vínculo: motivo e data do desligamento e, opcionalmente, as verbas rescisórias
 * (verbasResc → dmDev, mesma forma do S-1200). Substitui a baixa em CTPS.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtDeslig antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente. Modelamos o NÚCLEO
 * (motivo/data + pensão alimentícia + verbasResc resumido); succVinc, quarentena,
 * procJudTrab e o detalhamento completo das verbas ficam como extensão futura.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois pelo motor.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb
 * @param {number} [dados.procEmi=1]
 * @param {string} [dados.verProc='BearERP']
 * @param {number} [dados.indRetif=1]
 * @param {string} [dados.nrRecibo]
 * @param {number} dados.tpInsc
 * @param {string} dados.nrInsc
 * @param {object} dados.ideVinculo          { cpfTrab, matricula }
 * @param {object} dados.infoDeslig          { mtvDeslig, dtDeslig, pensAlim, ... verbasResc? }
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS2299(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtDeslig';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const iv = dados.ideVinculo;
  const inf = dados.infoDeslig;

  const corpo = el(alias, { Id: id }, [
    el('ideEvento', [
      el('indRetif', dados.indRetif ?? 1),
      el('nrRecibo', dados.indRetif === 2 ? dados.nrRecibo : undefined),
      el('tpAmb', dados.tpAmb),
      el('procEmi', dados.procEmi ?? 1),
      el('verProc', dados.verProc ?? 'BearERP'),
    ]),
    el('ideEmpregador', [
      el('tpInsc', dados.tpInsc),
      el('nrInsc', soDigitos(dados.nrInsc)),
    ]),
    el('ideVinculo', [
      el('cpfTrab', soDigitos(iv.cpfTrab)),
      el('matricula', iv.matricula),
    ]),
    el('infoDeslig', [
      el('mtvDeslig', inf.mtvDeslig),
      el('dtDeslig', inf.dtDeslig),
      el('indPagtoAPI', inf.indPagtoAPI),
      el('dtProjFimAPI', inf.dtProjFimAPI),
      el('pensAlim', inf.pensAlim),
      el('percAliment', inf.percAliment),
      el('vrAlim', inf.vrAlim),
      el('nrCertObito', inf.nrCertObito),
      el('indCumprParc', inf.indCumprParc),
      el('observacao', inf.observacao),
      // verbasResc (0..1) — demonstrativos de verbas rescisórias (dmDev 1..N).
      inf.verbasResc
        ? el('verbasResc', (inf.verbasResc.dmDev || []).map((dm) => blocoDmDev(dm)))
        : undefined,
    ]),
  ]);

  const xml = `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
  return { id, xml, alias };
}

/** Demonstrativo de verba rescisória — mesma forma do S-1200 (resumido). */
function blocoDmDev(dm) {
  const estabs = dm.ideEstabLot || [];
  return el('dmDev', [
    el('ideDmDev', dm.ideDmDev),
    el('codCateg', dm.codCateg),
    el('infoPerApur', [
      ...estabs.map((e) =>
        el('ideEstabLot', [
          el('tpInsc', e.tpInsc),
          el('nrInsc', soDigitos(e.nrInsc)),
          el('codLotacao', e.codLotacao),
          ...(e.remunPerApur || []).map((r) =>
            el('remunPerApur', [
              el('matricula', r.matricula),
              ...(r.itensRemun || []).map((i) =>
                el('itensRemun', [
                  el('codRubr', i.codRubr),
                  el('ideTabRubr', i.ideTabRubr),
                  el('qtdRubr', i.qtdRubr),
                  el('fatorRubr', i.fatorRubr),
                  el('vrUnit', i.vrUnit),
                  el('vrRubr', i.vrRubr),
                ]),
              ),
            ]),
          ),
        ]),
      ),
    ]),
  ]);
}

function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function validar(d) {
  const faltando = [];
  if (d.tpAmb !== 1 && d.tpAmb !== 2) faltando.push('tpAmb (1|2)');
  if (d.indRetif === 2 && !d.nrRecibo) faltando.push('nrRecibo (obrigatório quando indRetif=2)');
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  const iv = d.ideVinculo;
  if (!iv) faltando.push('ideVinculo');
  else {
    if (!iv.cpfTrab) faltando.push('ideVinculo.cpfTrab');
    else if (soDigitos(iv.cpfTrab).length !== 11) faltando.push('ideVinculo.cpfTrab (11 dígitos)');
    if (!iv.matricula) faltando.push('ideVinculo.matricula');
  }

  const inf = d.infoDeslig;
  if (!inf) faltando.push('infoDeslig');
  else {
    if (!inf.mtvDeslig) faltando.push('infoDeslig.mtvDeslig');
    if (!ehData(inf.dtDeslig)) faltando.push('infoDeslig.dtDeslig (aaaa-mm-dd)');
    // pensAlim é obrigatório: 0=não existe, 1=%, 2=valor, 3=ambos.
    if (![0, 1, 2, 3].includes(Number(inf.pensAlim))) faltando.push('infoDeslig.pensAlim (0|1|2|3)');
    if ([1, 3].includes(Number(inf.pensAlim)) && inf.percAliment == null) faltando.push('infoDeslig.percAliment (exigido p/ pensAlim 1|3)');
    if ([2, 3].includes(Number(inf.pensAlim)) && inf.vrAlim == null) faltando.push('infoDeslig.vrAlim (exigido p/ pensAlim 2|3)');
  }

  if (faltando.length) {
    throw new Error(`S-2299 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

module.exports = { montarS2299 };
