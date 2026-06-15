'use strict';

const { el } = require('../../xml');
const { gerarId } = require('../../ids');
const { nsEvento } = require('../../namespaces');

/**
 * Evento S-2240 — Condições Ambientais do Trabalho / Agentes Nocivos (evento NÃO
 * PERIÓDICO de SST, grupo 1). Descreve o ambiente, as atividades e os agentes
 * nocivos a que o trabalhador está exposto (base do PPP e da aposentadoria
 * especial).
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtExpRisco antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente. epcEpi e o detalhamento
 * de EPIs por agente ficam como extensão futura quando o XSD for incorporado.
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
 * @param {object} dados.infoExpRisco        { dtIniCondicao, infoAmb[], infoAtiv?, agNoc[], respReg[], obs? }
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS2240(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtExpRisco';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const iv = dados.ideVinculo;
  const ie = dados.infoExpRisco;
  const ambientes = ie.infoAmb || [];
  const agentes = ie.agNoc || [];
  const resps = ie.respReg || [];

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
    el('infoExpRisco', [
      el('dtIniCondicao', ie.dtIniCondicao),
      ...ambientes.map((a) =>
        el('infoAmb', [
          el('localAmb', a.localAmb),
          el('dscSetor', a.dscSetor),
          el('tpInsc', a.tpInsc),
          el('nrInsc', a.nrInsc ? soDigitos(a.nrInsc) : undefined),
        ]),
      ),
      ie.infoAtiv ? el('infoAtiv', [el('dscAtivDes', ie.infoAtiv.dscAtivDes)]) : undefined,
      ...agentes.map((g) =>
        el('agNoc', [
          el('codAgNoc', g.codAgNoc),
          el('dscAgNoc', g.dscAgNoc),
          el('tpAval', g.tpAval),
          el('intConc', g.intConc),
          el('limTol', g.limTol),
          el('unMed', g.unMed),
          el('tecMedicao', g.tecMedicao),
        ]),
      ),
      ...resps.map((r) =>
        el('respReg', [
          el('cpfResp', soDigitos(r.cpfResp)),
          el('ideOC', r.ideOC),
          el('dscOC', r.dscOC),
          el('nrOC', r.nrOC),
          el('ufOC', r.ufOC),
        ]),
      ),
      // obs (0..1) — observações complementares.
      ie.obs ? el('obs', [el('obsCompl', ie.obs)]) : undefined,
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

  const ie = d.infoExpRisco;
  if (!ie) {
    faltando.push('infoExpRisco');
    lancar(faltando);
    return;
  }
  if (!ehData(ie.dtIniCondicao)) faltando.push('infoExpRisco.dtIniCondicao (aaaa-mm-dd)');

  const ambientes = ie.infoAmb || [];
  if (!ambientes.length) faltando.push('infoExpRisco.infoAmb (≥1)');
  ambientes.forEach((a, i) => {
    if (a.localAmb == null) faltando.push(`infoExpRisco.infoAmb[${i}].localAmb (1=estab. próprio|2=terceiros)`);
    if (!a.dscSetor) faltando.push(`infoExpRisco.infoAmb[${i}].dscSetor`);
  });

  const agentes = ie.agNoc || [];
  if (!agentes.length) faltando.push('infoExpRisco.agNoc (≥1)');
  agentes.forEach((g, i) => {
    if (!g.codAgNoc) faltando.push(`infoExpRisco.agNoc[${i}].codAgNoc`);
  });

  const resps = ie.respReg || [];
  if (!resps.length) faltando.push('infoExpRisco.respReg (≥1)');
  resps.forEach((r, i) => {
    if (!r.cpfResp) faltando.push(`infoExpRisco.respReg[${i}].cpfResp`);
    else if (soDigitos(r.cpfResp).length !== 11) faltando.push(`infoExpRisco.respReg[${i}].cpfResp (11 dígitos)`);
    if (r.ideOC == null) faltando.push(`infoExpRisco.respReg[${i}].ideOC`);
  });

  lancar(faltando);
}

function lancar(faltando) {
  if (faltando.length) {
    throw new Error(`S-2240 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

module.exports = { montarS2240 };
