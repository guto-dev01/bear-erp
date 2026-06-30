'use strict';

const { el } = require('../../xml');
const { gerarId } = require('../../ids');
const { nsEvento } = require('../../namespaces');

/**
 * Evento S-2220 — Monitoramento da Saúde do Trabalhador / ASO (evento NÃO
 * PERIÓDICO de SST, grupo 1). Informa os Atestados de Saúde Ocupacional
 * (admissional, periódico, demissional etc.) e os exames complementares.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtMonit antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente (el() devolve '' para
 * children null/undefined). respMonit (responsável pelo monitoramento) é
 * opcional no leiaute e omitido quando não fornecido.
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
 * @param {object} dados.ideVinculo          { cpfTrab, matricula?, codCateg? }
 * @param {object} dados.exMedOcup           { tpExameOcup, aso, respMonit? }
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS2220(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtMonit';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const iv = dados.ideVinculo;
  const ex = dados.exMedOcup;
  const aso = ex.aso || {};
  const med = aso.medico || {};
  const exames = aso.exame || [];
  const rm = ex.respMonit;

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
      el('codCateg', iv.codCateg),
    ]),
    el('exMedOcup', [
      el('tpExameOcup', ex.tpExameOcup),
      el('aso', [
        el('dtAso', aso.dtAso),
        el('resAso', aso.resAso),
        ...exames.map((e) =>
          el('exame', [
            el('dtExm', e.dtExm),
            el('procRealizado', e.procRealizado),
            el('obsProc', e.obsProc),
            el('ordExame', e.ordExame),
            el('indResult', e.indResult),
          ]),
        ),
        el('medico', [
          el('nmMed', med.nmMed),
          el('nrCRM', med.nrCRM),
          el('ufCRM', med.ufCRM),
        ]),
      ]),
      // respMonit (0..1) — médico responsável pelo PCMSO.
      rm
        ? el('respMonit', [
            el('cpfResp', soDigitos(rm.cpfResp)),
            el('nmResp', rm.nmResp),
            el('nrCRM', rm.nrCRM),
            el('ufCRM', rm.ufCRM),
          ])
        : undefined,
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
  if (d.indRetif === 2 && !d.nrRecibo) faltando.push('nrRecibo (obrigatório quando indRetif=2)');
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  const iv = d.ideVinculo;
  if (!iv || !iv.cpfTrab) faltando.push('ideVinculo.cpfTrab');
  else if (soDigitos(iv.cpfTrab).length !== 11) faltando.push('ideVinculo.cpfTrab (11 dígitos)');

  const ex = d.exMedOcup;
  if (!ex) {
    faltando.push('exMedOcup');
    lancar(faltando);
    return;
  }
  if (ex.tpExameOcup == null) faltando.push('exMedOcup.tpExameOcup (0=admissional..9=...)');

  const aso = ex.aso;
  if (!aso) faltando.push('exMedOcup.aso');
  else {
    if (!ehData(aso.dtAso)) faltando.push('exMedOcup.aso.dtAso (aaaa-mm-dd)');
    if (aso.resAso == null) faltando.push('exMedOcup.aso.resAso (1=apto|2=inapto)');
    const exames = aso.exame || [];
    if (!exames.length) faltando.push('exMedOcup.aso.exame (≥1)');
    exames.forEach((e, i) => {
      if (!ehData(e.dtExm)) faltando.push(`exMedOcup.aso.exame[${i}].dtExm (aaaa-mm-dd)`);
      if (!e.procRealizado) faltando.push(`exMedOcup.aso.exame[${i}].procRealizado`);
    });
    const med = aso.medico;
    if (!med || !med.nmMed) faltando.push('exMedOcup.aso.medico.nmMed');
    if (!med || !med.nrCRM) faltando.push('exMedOcup.aso.medico.nrCRM');
    if (!med || !med.ufCRM || !/^[A-Z]{2}$/.test(String(med.ufCRM))) faltando.push('exMedOcup.aso.medico.ufCRM (2 letras)');
  }

  lancar(faltando);
}

function lancar(faltando) {
  if (faltando.length) {
    throw new Error(`S-2220 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

module.exports = { montarS2220 };
