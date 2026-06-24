'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-2206 — Alteração de Contrato de Trabalho/Relação Estatutária (evento
 * NÃO PERIÓDICO, grupo 2). Registra mudanças no contrato já criado pelo S-2200
 * (cargo, salário, jornada, local etc.) a partir de uma data de alteração.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtAltContratual antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente. Apenas os blocos que
 * mudaram precisam ser informados dentro de `vinculo` (o leiaute permite enviar
 * só o que foi alterado); aqui modelamos infoContrato (cargo/remuneração/duração/
 * local/jornada) — os demais blocos ficam como extensão futura via XSD.
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
 * @param {object} dados.altContratual       { dtAlteracao, dtEf?, dscAlt?, vinculo }
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS2206(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtAltContratual';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const iv = dados.ideVinculo;
  const ac = dados.altContratual;
  const v = ac.vinculo || {};
  const ic = v.infoContrato || {};
  const rem = ic.remuneracao;
  const dur = ic.duracao;
  const loc = ic.localTrabalho;
  const lg = loc && loc.localTrabGeral;
  const hor = ic.horContratual;

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
    el('altContratual', [
      el('dtAlteracao', ac.dtAlteracao),
      el('dtEf', ac.dtEf),
      el('dscAlt', ac.dscAlt),
      el('vinculo', [
        el('tpRegPrev', v.tpRegPrev),
        el('infoContrato', [
          el('nmCargo', ic.nmCargo),
          el('codCargo', ic.codCargo),
          el('codFuncao', ic.codFuncao),
          el('codCateg', ic.codCateg),
          rem
            ? el('remuneracao', [
                el('vrSalFx', rem.vrSalFx),
                el('undSalFixo', rem.undSalFixo),
                el('dscSalVar', rem.dscSalVar),
              ])
            : undefined,
          dur
            ? el('duracao', [
                el('tpContr', dur.tpContr),
                el('dtTerm', dur.dtTerm),
              ])
            : undefined,
          lg
            ? el('localTrabalho', [
                el('localTrabGeral', [
                  el('tpInsc', lg.tpInsc),
                  el('nrInsc', soDigitos(lg.nrInsc)),
                  el('descComp', lg.descComp),
                ]),
              ])
            : undefined,
          hor
            ? el('horContratual', [
                el('qtdHrsSem', hor.qtdHrsSem),
                el('tpJornada', hor.tpJornada),
                el('dscTpJorn', hor.dscTpJorn),
                el('tmpParc', hor.tmpParc),
              ])
            : undefined,
        ]),
      ]),
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
  if (!iv) faltando.push('ideVinculo');
  else {
    if (!iv.cpfTrab) faltando.push('ideVinculo.cpfTrab');
    else if (soDigitos(iv.cpfTrab).length !== 11) faltando.push('ideVinculo.cpfTrab (11 dígitos)');
    if (!iv.matricula) faltando.push('ideVinculo.matricula');
  }

  const ac = d.altContratual;
  if (!ac) faltando.push('altContratual');
  else {
    if (!ehData(ac.dtAlteracao)) faltando.push('altContratual.dtAlteracao (aaaa-mm-dd)');
    if (ac.dtEf != null && !ehData(ac.dtEf)) faltando.push('altContratual.dtEf (aaaa-mm-dd)');
    if (!ac.vinculo || !ac.vinculo.infoContrato) faltando.push('altContratual.vinculo.infoContrato');
  }

  if (faltando.length) {
    throw new Error(`S-2206 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

module.exports = { montarS2206 };
