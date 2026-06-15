'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-1010 — Tabela de Rubricas (evento de TABELA, grupo 1).
 * Define as rubricas (verbas) usadas na folha (S-1200/S-1210) e suas
 * incidências (CP, IRRF, FGTS, sindical). É pré-requisito da folha.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtTabRubrica antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD (XSD fica como pendência).
 *
 * Campos opcionais ausentes são omitidos automaticamente (el() devolve '' para
 * children null/undefined). Como todo evento de tabela, suporta as três
 * operações: inclusao | alteracao | exclusao.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois pelo motor.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb                1=produção, 2=produção restrita
 * @param {number} [dados.procEmi=1]
 * @param {string} [dados.verProc='BearERP']
 * @param {number} dados.tpInsc               1=CNPJ, 2=CPF
 * @param {string} dados.nrInsc               raiz do CNPJ (8) ou CPF (11)
 * @param {'inclusao'|'alteracao'|'exclusao'} [dados.operacao='inclusao']
 * @param {object} dados.ideRubrica           { codRubr, ideTabRubr, iniValid, fimValid? }
 * @param {object} [dados.dadosRubrica]        obrigatório em inclusao/alteracao
 * @param {object} [dados.novaValidade]        opcional só em alteracao
 * @param {object} [opts]
 * @param {string} [opts.versaoLeiaute='S-1.3']
 * @param {Date}   [opts.data=new Date()]
 * @param {number} [opts.sequencial=1]
 * @param {string} [opts.nsOverride]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS1010(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtTabRubrica';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const operacao = dados.operacao || 'inclusao';
  const ir = dados.ideRubrica;

  const ideRubrica = el('ideRubrica', [
    el('codRubr', ir.codRubr),
    el('ideTabRubr', ir.ideTabRubr),
    el('iniValid', ir.iniValid),
    el('fimValid', ir.fimValid),
  ]);

  const corpo = el(alias, { Id: id }, [
    el('ideEvento', [
      el('tpAmb', dados.tpAmb),
      el('procEmi', dados.procEmi ?? 1),
      el('verProc', dados.verProc ?? 'BearERP'),
    ]),
    el('ideEmpregador', [
      el('tpInsc', dados.tpInsc),
      el('nrInsc', soDigitos(dados.nrInsc)),
    ]),
    el('infoRubrica', [
      el(operacao, [
        ideRubrica,
        // exclusao só carrega ideRubrica; inclusao/alteracao carregam dadosRubrica.
        operacao === 'exclusao' ? undefined : blocoDadosRubrica(dados.dadosRubrica),
        // novaValidade só existe em alteracao (quando se reabre/estende validade).
        operacao === 'alteracao' && dados.novaValidade
          ? el('novaValidade', [
              el('iniValid', dados.novaValidade.iniValid),
              el('fimValid', dados.novaValidade.fimValid),
            ])
          : undefined,
      ]),
    ]),
  ]);

  const xml = `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
  return { id, xml, alias };
}

/** Bloco dadosRubrica (incidências + processos vinculados). */
function blocoDadosRubrica(dr) {
  const procCP = dr.ideProcessoCP || [];
  const procIRRF = dr.ideProcessoIRRF || [];
  const procFGTS = dr.ideProcessoFGTS || [];
  const procSIND = dr.ideProcessoSind || [];
  return el('dadosRubrica', [
    el('dscRubr', dr.dscRubr),
    el('natRubr', dr.natRubr),
    el('tpRubr', dr.tpRubr),
    el('codIncCP', dr.codIncCP),
    el('codIncIRRF', dr.codIncIRRF),
    el('codIncFGTS', dr.codIncFGTS),
    el('codIncCPRP', dr.codIncCPRP),
    el('codIncPisPasep', dr.codIncPisPasep),
    el('tetoRemun', dr.tetoRemun),
    el('observacao', dr.observacao),
    ...procCP.map((p) =>
      el('ideProcessoCP', [
        el('tpProc', p.tpProc),
        el('nrProc', p.nrProc),
        el('extDecisao', p.extDecisao),
        el('codSusp', p.codSusp),
      ]),
    ),
    ...procIRRF.map((p) =>
      el('ideProcessoIRRF', [el('nrProc', p.nrProc), el('codSusp', p.codSusp)]),
    ),
    ...procFGTS.map((p) => el('ideProcessoFGTS', [el('nrProc', p.nrProc)])),
    ...procSIND.map((p) => el('ideProcessoSind', [el('nrProc', p.nrProc)])),
  ]);
}

function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function validar(d) {
  const faltando = [];
  if (d.tpAmb !== 1 && d.tpAmb !== 2) faltando.push('tpAmb (1|2)');
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  const op = d.operacao || 'inclusao';
  if (!['inclusao', 'alteracao', 'exclusao'].includes(op)) {
    faltando.push('operacao (inclusao|alteracao|exclusao)');
  }

  const ir = d.ideRubrica;
  if (!ir) faltando.push('ideRubrica');
  else {
    if (!ir.codRubr) faltando.push('ideRubrica.codRubr');
    if (!ir.ideTabRubr) faltando.push('ideRubrica.ideTabRubr');
    if (!ehAnoMes(ir.iniValid)) faltando.push('ideRubrica.iniValid (aaaa-mm)');
    if (ir.fimValid != null && !ehAnoMes(ir.fimValid)) faltando.push('ideRubrica.fimValid (aaaa-mm)');
  }

  // dadosRubrica é obrigatório em inclusao/alteracao; proibido (ignorado) em exclusao.
  if (op !== 'exclusao') {
    const dr = d.dadosRubrica;
    if (!dr) faltando.push('dadosRubrica (obrigatório em inclusao/alteracao)');
    else {
      if (!dr.dscRubr) faltando.push('dadosRubrica.dscRubr');
      if (!dr.natRubr) faltando.push('dadosRubrica.natRubr');
      if (dr.tpRubr == null) faltando.push('dadosRubrica.tpRubr (1|2|3|4)');
      if (dr.codIncCP == null) faltando.push('dadosRubrica.codIncCP');
      if (dr.codIncIRRF == null) faltando.push('dadosRubrica.codIncIRRF');
      if (dr.codIncFGTS == null) faltando.push('dadosRubrica.codIncFGTS');
    }
  }

  if (faltando.length) {
    throw new Error(`S-1010 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehAnoMes(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
}

module.exports = { montarS1010 };
