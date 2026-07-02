'use strict';

/**
 * Construtores PUROS dos eventos da NF-e (mod. 55) e da inutilização de numeração.
 * Só montam strings XML NÃO assinadas; a assinatura (assinarElemento sobre infEvento/
 * infInut) e o transporte (transmissao.js) ficam fora. Evento = versão 1.00;
 * inutilização = 4.00. `dhEvento` é injetado pelo caller (determinístico p/ teste).
 */

const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';

// Texto legal FIXO exigido pela SEFAZ na Carta de Correção (não pode variar).
const XCOND_USO_CCE =
  'A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, ' +
  'de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido ' +
  'na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as ' +
  'variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, ' +
  'diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de ' +
  'dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de ' +
  'emissao ou de saida.';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function pad(v, n) { return String(v).padStart(n, '0'); }

function validarJust(xJust) {
  const j = String(xJust ?? '').trim();
  if (j.length < 15 || j.length > 255) throw new Error('Justificativa deve ter entre 15 e 255 caracteres');
  return j;
}

/** Id do evento = "ID" + tpEvento(6) + chNFe(44) + nSeqEvento(2). */
function idEvento(tpEvento, chave, nSeqEvento) {
  return `ID${tpEvento}${chave}${pad(nSeqEvento, 2)}`;
}

function montarEvento({ tpEvento, chave, cnpj, cOrgao, tpAmb, nSeqEvento, dhEvento, detEventoInterno }) {
  if (!/^\d{44}$/.test(String(chave))) throw new Error('Chave de acesso deve ter 44 dígitos');
  if (!dhEvento) throw new Error('dhEvento é obrigatório (ISO com fuso, ex.: 2026-07-01T10:00:00-03:00)');
  const org = cOrgao ?? String(chave).slice(0, 2);
  const infEvento =
    `<infEvento Id="${idEvento(tpEvento, chave, nSeqEvento)}">` +
    `<cOrgao>${org}</cOrgao><tpAmb>${tpAmb}</tpAmb><CNPJ>${cnpj}</CNPJ>` +
    `<chNFe>${chave}</chNFe><dhEvento>${dhEvento}</dhEvento>` +
    `<tpEvento>${tpEvento}</tpEvento><nSeqEvento>${nSeqEvento}</nSeqEvento>` +
    `<verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00">${detEventoInterno}</detEvento>` +
    `</infEvento>`;
  return `<evento versao="1.00" xmlns="${NFE_NS}">${infEvento}</evento>`;
}

/** Cancelamento (tpEvento 110111) — exige o protocolo de autorização (nProt). */
function montarEventoCancelamento({ chave, cnpj, nProt, xJust, nSeqEvento = 1, tpAmb = '2', cOrgao, dhEvento }) {
  const just = validarJust(xJust);
  if (!nProt) throw new Error('nProt (protocolo de autorização) é obrigatório no cancelamento');
  const det = `<descEvento>Cancelamento</descEvento><nProt>${nProt}</nProt><xJust>${esc(just)}</xJust>`;
  return montarEvento({ tpEvento: '110111', chave, cnpj, cOrgao, tpAmb, nSeqEvento, dhEvento, detEventoInterno: det });
}

/** Carta de Correção (tpEvento 110110) — inclui o xCondUso legal fixo. */
function montarEventoCCe({ chave, cnpj, xCorrecao, nSeqEvento = 1, tpAmb = '2', cOrgao, dhEvento }) {
  const corr = String(xCorrecao ?? '').trim();
  if (corr.length < 15 || corr.length > 1000) throw new Error('xCorrecao deve ter entre 15 e 1000 caracteres');
  const det = `<descEvento>Carta de Correcao</descEvento><xCorrecao>${esc(corr)}</xCorrecao><xCondUso>${XCOND_USO_CCE}</xCondUso>`;
  return montarEvento({ tpEvento: '110110', chave, cnpj, cOrgao, tpAmb, nSeqEvento, dhEvento, detEventoInterno: det });
}

// ── Manifestação do Destinatário ──────────────────────────────────────────
// Eventos que o DESTINATÁRIO registra sobre uma NF-e recebida. Recebidos pelo
// Ambiente Nacional (Receita Federal), por isso cOrgao é SEMPRE 91.
const MANIFESTACAO = Object.freeze({
  '210200': 'Confirmacao da Operacao',
  '210210': 'Ciencia da Operacao',
  '210220': 'Desconhecimento da Operacao',
  '210240': 'Operacao nao Realizada',
});

/**
 * Evento de Manifestação do Destinatário.
 *  - 210210 Ciência da Operação — libera o download do XML completo pela distribuição.
 *  - 210200 Confirmação · 210220 Desconhecimento · 210240 Operação não Realizada.
 * Só a 210240 aceita/exige justificativa (xJust, 15..255). cOrgao fixo = 91 (AN).
 * @param {{ chave, cnpj, tpEvento, xJust?, nSeqEvento?, tpAmb?, dhEvento }} p
 */
function montarEventoManifestacao({ chave, cnpj, tpEvento, xJust, nSeqEvento = 1, tpAmb = '2', dhEvento }) {
  const desc = MANIFESTACAO[tpEvento];
  if (!desc) throw new Error(`tpEvento de manifestação inválido: ${tpEvento}`);
  let det = `<descEvento>${desc}</descEvento>`;
  if (tpEvento === '210240') {
    det += `<xJust>${esc(validarJust(xJust))}</xJust>`;
  } else if (xJust) {
    throw new Error('xJust só é aceito na Operação não Realizada (210240)');
  }
  return montarEvento({ tpEvento, chave, cnpj, cOrgao: '91', tpAmb, nSeqEvento, dhEvento, detEventoInterno: det });
}

/**
 * Inutilização de faixa de numeração (versão 4.00).
 * Id = "ID" + cUF(2) + ano(2) + CNPJ(14) + mod(2) + serie(3) + nNFIni(9) + nNFFin(9).
 */
function montarInutilizacao({ cUF, ano, cnpj, mod = '55', serie, nNFIni, nNFFin, xJust, tpAmb = '2' }) {
  const just = validarJust(xJust);
  if (Number(nNFIni) > Number(nNFFin)) throw new Error('nNFIni não pode ser maior que nNFFin');
  const anoStr = pad(String(ano).slice(-2), 2);
  const id = `ID${pad(cUF, 2)}${anoStr}${cnpj}${pad(mod, 2)}${pad(serie, 3)}${pad(nNFIni, 9)}${pad(nNFFin, 9)}`;
  const infInut =
    `<infInut Id="${id}">` +
    `<tpAmb>${tpAmb}</tpAmb><xServ>INUTILIZAR</xServ>` +
    `<cUF>${cUF}</cUF><ano>${anoStr}</ano><CNPJ>${cnpj}</CNPJ>` +
    `<mod>${mod}</mod><serie>${serie}</serie>` +
    `<nNFIni>${nNFIni}</nNFIni><nNFFin>${nNFFin}</nNFFin>` +
    `<xJust>${esc(just)}</xJust>` +
    `</infInut>`;
  return `<inutNFe versao="4.00" xmlns="${NFE_NS}">${infInut}</inutNFe>`;
}

module.exports = {
  XCOND_USO_CCE,
  MANIFESTACAO,
  idEvento,
  montarEventoCancelamento,
  montarEventoCCe,
  montarEventoManifestacao,
  montarInutilizacao,
};
