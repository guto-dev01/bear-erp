'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-3000 — Exclusão de Eventos (evento de correção). Exclui um evento não
 * periódico ou periódico já transmitido e aceito, identificando-o pelo tipo e
 * pelo número do recibo. NÃO é retificação (essa é feita pelo próprio evento com
 * indRetif=2); é a remoção definitiva de um evento enviado por engano.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtExclusao antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente. ideTrabalhador e
 * ideFolhaPagto são exigidos conforme o tipo de evento excluído (o MOD detalha a
 * condicional); aqui são opcionais e emitidos quando fornecidos.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois pelo motor.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb
 * @param {number} [dados.procEmi=1]
 * @param {string} [dados.verProc='BearERP']
 * @param {number} dados.tpInsc
 * @param {string} dados.nrInsc
 * @param {object} dados.infoExclusao        { tpEvento, nrRecEvt, ideTrabalhador?, ideFolhaPagto? }
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS3000(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtExclusao';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const ie = dados.infoExclusao;
  const it = ie.ideTrabalhador;
  const fp = ie.ideFolhaPagto;

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
    el('infoExclusao', [
      el('tpEvento', ie.tpEvento),
      el('nrRecEvt', ie.nrRecEvt),
      // ideTrabalhador (0..1) — exigido para excluir eventos do trabalhador.
      it ? el('ideTrabalhador', [el('cpfTrab', soDigitos(it.cpfTrab))]) : undefined,
      // ideFolhaPagto (0..1) — exigido para excluir eventos periódicos.
      fp
        ? el('ideFolhaPagto', [
            el('indApuracao', fp.indApuracao),
            el('perApur', fp.perApur),
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
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  const ie = d.infoExclusao;
  if (!ie) faltando.push('infoExclusao');
  else {
    // tpEvento é o código do evento a excluir, ex.: 'S-2190', 'S-1200'.
    if (!ie.tpEvento || !/^S-\d{4}$/.test(String(ie.tpEvento))) faltando.push('infoExclusao.tpEvento (ex.: S-2200)');
    if (!ie.nrRecEvt) faltando.push('infoExclusao.nrRecEvt (recibo do evento a excluir)');
    if (ie.ideTrabalhador && soDigitos(ie.ideTrabalhador.cpfTrab).length !== 11) {
      faltando.push('infoExclusao.ideTrabalhador.cpfTrab (11 dígitos)');
    }
  }

  if (faltando.length) {
    throw new Error(`S-3000 inválido — campos: ${faltando.join(', ')}`);
  }
}

module.exports = { montarS3000 };
