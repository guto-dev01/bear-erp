'use strict';

const { el } = require('../../xml');
const { gerarId } = require('../../ids');
const { nsEvento } = require('../../namespaces');

/**
 * Evento S-2210 — Comunicação de Acidente de Trabalho (CAT). Evento NÃO PERIÓDICO
 * (grupo 1 no lote). Enviado SOMENTE pelo empregador — médico/polícia/sindicato
 * usam o CATWeb, fora de escopo aqui.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo, os tipos e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3,
 * mas DEVEM ser confirmados contra o XSD oficial do evtCAT antes de transmitir em
 * produção — não invente campos. Aqui a validação é por REGRAS em JS (`validar`),
 * não por XSD (decisão de projeto; XSD fica como pendência).
 *
 * Campos opcionais ausentes são omitidos automaticamente: `el()` devolve '' para
 * children null/undefined, então basta passar `undefined` que o nó some.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois por
 * `assinatura/xmldsig.js`, exatamente como nos demais eventos.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb                1=produção, 2=produção restrita (HOMOLOGAÇÃO)
 * @param {number} [dados.procEmi=1]          1=app do empregador
 * @param {string} [dados.verProc='BearERP']
 * @param {number} [dados.indRetif=1]         1=original, 2=retificação
 * @param {string} [dados.nrRecibo]           obrigatório quando indRetif=2
 * @param {number} dados.tpInsc               ideEmpregador: 1=CNPJ, 2=CPF
 * @param {string} dados.nrInsc               ideEmpregador (CNPJ completo, 14)
 * @param {object} dados.ideVinculo
 * @param {string} dados.ideVinculo.cpfTrab
 * @param {string} [dados.ideVinculo.matricula]
 * @param {object} dados.cat                  bloco do acidente (ver validar())
 * @param {object} [opts]
 * @param {string} [opts.versaoLeiaute='S-1.3']
 * @param {Date}   [opts.data=new Date()]
 * @param {number} [opts.sequencial=1]
 * @param {string} [opts.nsOverride]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS2210(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtCAT';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({
    tpInsc: dados.tpInsc,
    nrInsc: dados.nrInsc,
    data,
    sequencial,
  });

  const c = dados.cat;
  const la = c.localAcidente;
  const partes = c.partesAtingidas || [];
  const agentes = c.agentesCausadores || [];
  const at = c.atestado;

  const corpo = el(alias, { Id: id }, [
    el('ideEvento', [
      el('indRetif', dados.indRetif ?? 1),
      // nrRecibo só em retificação (indRetif=2).
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
      el('cpfTrab', soDigitos(dados.ideVinculo.cpfTrab)),
      el('matricula', dados.ideVinculo.matricula),
    ]),
    el('cat', [
      el('dtAcid', c.dtAcid),
      el('tpAcid', c.tpAcid),
      el('hrAcid', c.hrAcid),
      el('hrsTrabAntesAcid', c.hrsTrabAntesAcid),
      el('tpCat', c.tpCat),
      el('indCatObito', c.indCatObito),
      el('dtObito', c.dtObito),
      el('indComunPolicia', c.indComunPolicia),
      el('codSitGeradora', c.codSitGeradora),
      el('iniciatCAT', c.iniciatCAT),
      el('obsCAT', c.obsCAT),
      el('ultDiaTrab', c.ultDiaTrab),
      el('houveAfast', c.houveAfast),
      el('localAcidente', [
        el('tpLocal', la.tpLocal),
        el('dscLocal', la.dscLocal),
        el('dscLograd', la.dscLograd),
        el('nrLograd', la.nrLograd),
        el('complemento', la.complemento),
        el('bairro', la.bairro),
        el('cep', la.cep ? soDigitos(la.cep) : undefined),
        el('codMunic', la.codMunic),
        el('uf', la.uf),
        el('pais', la.pais),
        el('codPostal', la.codPostal),
        // ideLocalAcid é opcional (quando o local não é o do próprio empregador).
        la.ideLocalAcid
          ? el('ideLocalAcid', [
              el('tpInsc', la.ideLocalAcid.tpInsc),
              el('nrInsc', soDigitos(la.ideLocalAcid.nrInsc)),
            ])
          : undefined,
      ]),
      // parteAtingida (1..N) — um nó por parte.
      ...partes.map((p) =>
        el('parteAtingida', [
          el('codParteAting', p.codParteAting),
          el('lateralidade', p.lateralidade),
        ]),
      ),
      // agenteCausador (1..N).
      ...agentes.map((a) =>
        el('agenteCausador', [el('codAgntCausador', a.codAgntCausador)]),
      ),
      // atestado (0..1).
      at
        ? el('atestado', [
            el('dtAtendimento', at.dtAtendimento),
            el('hrAtendimento', at.hrAtendimento),
            el('indInternacao', at.indInternacao),
            el('durTrat', at.durTrat),
            el('indAfast', at.indAfast),
            el('dscLesao', at.dscLesao),
            el('dscCompLesao', at.dscCompLesao),
            el('diagProvavel', at.diagProvavel),
            el('codCID', at.codCID),
            el('emitente', [
              el('nmEmit', at.emitente?.nmEmit),
              el('ideOC', at.emitente?.ideOC),
              el('nrOC', at.emitente?.nrOC),
              el('ufOC', at.emitente?.ufOC),
            ]),
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

/**
 * Regras de leiaute (S-1.3) verificadas em JS — substituem o XSD nesta versão.
 * Cobre obrigatoriedades, formatos e as condicionais de negócio do evtCAT.
 */
function validar(d) {
  const faltando = [];

  if (d.tpAmb !== 1 && d.tpAmb !== 2) faltando.push('tpAmb (1|2)');
  if (d.indRetif === 2 && !d.nrRecibo) faltando.push('nrRecibo (obrigatório quando indRetif=2)');
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  if (!d.ideVinculo || !d.ideVinculo.cpfTrab) faltando.push('ideVinculo.cpfTrab');
  else if (soDigitos(d.ideVinculo.cpfTrab).length !== 11) faltando.push('ideVinculo.cpfTrab (11 dígitos)');

  const c = d.cat;
  if (!c) {
    faltando.push('cat');
    lancar(faltando);
    return;
  }

  if (!ehData(c.dtAcid)) faltando.push('cat.dtAcid (aaaa-mm-dd)');
  if (c.tpAcid == null) faltando.push('cat.tpAcid');
  if (c.hrAcid != null && !ehHora(c.hrAcid)) faltando.push('cat.hrAcid (hhmm)');
  if (c.hrsTrabAntesAcid != null && !ehHora(c.hrsTrabAntesAcid)) faltando.push('cat.hrsTrabAntesAcid (hhmm)');
  if (![1, 2, 3].includes(Number(c.tpCat))) faltando.push('cat.tpCat (1=inicial|2=reabertura|3=óbito)');

  // Óbito: indCatObito=S e dtObito obrigatórios.
  if (Number(c.tpCat) === 3) {
    if (c.indCatObito !== 'S') faltando.push('cat.indCatObito=S (obrigatório em óbito)');
    if (!ehData(c.dtObito)) faltando.push('cat.dtObito (aaaa-mm-dd, obrigatório em óbito)');
  }
  if (c.indCatObito === 'S' && !ehData(c.dtObito)) faltando.push('cat.dtObito (obrigatório quando indCatObito=S)');

  if (!ehSimNao(c.indComunPolicia)) faltando.push('cat.indComunPolicia (S|N)');
  if (!c.codSitGeradora) faltando.push('cat.codSitGeradora');
  if (![1, 2, 3].includes(Number(c.iniciatCAT))) faltando.push('cat.iniciatCAT (1|2|3)');
  if (!ehSimNao(c.houveAfast)) faltando.push('cat.houveAfast (S|N)');
  if (c.ultDiaTrab != null && !ehData(c.ultDiaTrab)) faltando.push('cat.ultDiaTrab (aaaa-mm-dd)');

  // localAcidente — bloco obrigatório.
  const la = c.localAcidente;
  if (!la) faltando.push('cat.localAcidente');
  else {
    if (la.tpLocal == null) faltando.push('cat.localAcidente.tpLocal');
    if (!la.codMunic) faltando.push('cat.localAcidente.codMunic');
    if (!la.uf || !/^[A-Z]{2}$/.test(String(la.uf))) faltando.push('cat.localAcidente.uf (sigla 2 letras)');
    if (la.ideLocalAcid && !la.ideLocalAcid.nrInsc) faltando.push('cat.localAcidente.ideLocalAcid.nrInsc');
  }

  // parteAtingida (1..N) e agenteCausador (1..N) — ao menos um.
  const partes = c.partesAtingidas || [];
  if (!partes.length) faltando.push('cat.partesAtingidas (≥1)');
  partes.forEach((p, i) => {
    if (!p.codParteAting) faltando.push(`cat.partesAtingidas[${i}].codParteAting`);
    if (p.lateralidade == null) faltando.push(`cat.partesAtingidas[${i}].lateralidade`);
  });

  const agentes = c.agentesCausadores || [];
  if (!agentes.length) faltando.push('cat.agentesCausadores (≥1)');
  agentes.forEach((a, i) => {
    if (!a.codAgntCausador) faltando.push(`cat.agentesCausadores[${i}].codAgntCausador`);
  });

  // atestado (0..1) — se presente, exige dtAtendimento, dscLesao, codCID e emitente.
  if (c.atestado) {
    const at = c.atestado;
    if (!ehData(at.dtAtendimento)) faltando.push('cat.atestado.dtAtendimento (aaaa-mm-dd)');
    if (at.hrAtendimento != null && !ehHora(at.hrAtendimento)) faltando.push('cat.atestado.hrAtendimento (hhmm)');
    if (!at.dscLesao) faltando.push('cat.atestado.dscLesao');
    if (!at.codCID) faltando.push('cat.atestado.codCID');
    if (!at.emitente || !at.emitente.nmEmit) faltando.push('cat.atestado.emitente.nmEmit');
    else {
      if (![1, 2, 3].includes(Number(at.emitente.ideOC))) faltando.push('cat.atestado.emitente.ideOC (1=CRM|2=CRO|3=RMS)');
      if (!at.emitente.nrOC) faltando.push('cat.atestado.emitente.nrOC');
    }
  }

  lancar(faltando);
}

function lancar(faltando) {
  if (faltando.length) {
    throw new Error(`S-2210 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function ehHora(v) {
  return /^\d{4}$/.test(String(v));
}
function ehSimNao(v) {
  return v === 'S' || v === 'N';
}

module.exports = { montarS2210 };
