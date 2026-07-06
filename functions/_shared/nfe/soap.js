'use strict';

/**
 * Envelopes SOAP 1.2 dos WebServices da NF-e (modelo 55, layout 4.00).
 *
 * É SOAP 1.2 (não 1.1): namespace http://www.w3.org/2003/05/soap-envelope e
 * Content-Type application/soap+xml com o `action` embutido (o transporte
 * cuida disso via flag `soap12` no cliente-soap). A SEFAZ REJEITA 1.1 com o
 * fault "Possible SOAP version mismatch: … Expecting
 * http://www.w3.org/2003/05/soap-envelope" (observado na SEFAZ-SP homolog).
 * O corpo de cada operação é o elemento `nfeDadosMsg` no namespace do WSDL
 * do serviço, contendo o XML da mensagem (enviNFe, consStatServ, …).
 *
 * Módulo PURO: só monta strings. A assinatura e o transporte (mTLS) ficam no
 * orquestrador (transmissao.js).
 */

const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';
const SOAP_NS = 'http://www.w3.org/2003/05/soap-envelope';

/** Namespaces dos WSDL por serviço (usados no nfeDadosMsg e no SOAPAction). */
const WSDL = Object.freeze({
  NFeAutorizacao4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
  NFeRetAutorizacao4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4',
  NFeStatusServico4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4',
  NFeRecepcaoEvento4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4',
  NFeInutilizacao4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4',
  NFeDistribuicaoDFe: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe',
});

/** Versão do leiaute da Distribuição DF-e. */
const VERSAO_DIST_DFE = '1.35';

function pad15(v) { return String(v ?? 0).padStart(15, '0'); }

/** Remove a declaração <?xml ?> de um fragmento que vai ser embutido. */
function semProlog(xml) {
  return String(xml).replace(/<\?xml[^>]*\?>/g, '').trim();
}

/** Envelopa um corpo de operação no Envelope SOAP 1.1. */
function envelope(corpoInterno) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<soap:Envelope xmlns:soap="${SOAP_NS}"><soap:Header/><soap:Body>${corpoInterno}</soap:Body></soap:Envelope>`
  );
}

/**
 * Monta o `enviNFe` (lote de envio) em torno da NF-e JÁ ASSINADA.
 * @param {string} nfeAssinada  XML `<NFe>…<Signature/></NFe>`
 * @param {{ idLote?: string|number, indSinc?: '0'|'1' }} [opts]  indSinc 1 = síncrono
 */
function montarEnviNFe(nfeAssinada, { idLote = '1', indSinc = '1' } = {}) {
  return (
    `<enviNFe versao="4.00" xmlns="${NFE_NS}">` +
    `<idLote>${idLote}</idLote><indSinc>${indSinc}</indSinc>` +
    semProlog(nfeAssinada) +
    '</enviNFe>'
  );
}

/**
 * Envelope da operação NFeAutorizacao4.
 * @param {string} enviNFeXml  resultado de montarEnviNFe
 * @returns {{ xmlEnvelope: string, soapAction: string }}
 */
function envelopeAutorizacao(enviNFeXml) {
  const corpo = `<nfeDadosMsg xmlns="${WSDL.NFeAutorizacao4}">${semProlog(enviNFeXml)}</nfeDadosMsg>`;
  return { xmlEnvelope: envelope(corpo), soapAction: WSDL.NFeAutorizacao4 };
}

/**
 * Envelope da operação NFeStatusServico4 (o "ping" do serviço).
 * @param {{ cUF: string|number, tpAmb?: '1'|'2' }} p
 * @returns {{ xmlEnvelope: string, soapAction: string }}
 */
function envelopeStatusServico({ cUF, tpAmb = '2' }) {
  if (!cUF) throw new Error('cUF é obrigatório para o status do serviço');
  const cons =
    `<consStatServ versao="4.00" xmlns="${NFE_NS}">` +
    `<tpAmb>${tpAmb}</tpAmb><cUF>${cUF}</cUF><xServ>STATUS</xServ>` +
    '</consStatServ>';
  const corpo = `<nfeDadosMsg xmlns="${WSDL.NFeStatusServico4}">${cons}</nfeDadosMsg>`;
  return { xmlEnvelope: envelope(corpo), soapAction: WSDL.NFeStatusServico4 };
}

/** Monta o `envEvento` (lote de 1 evento) em torno do evento JÁ ASSINADO. */
function montarEnvEvento(eventoAssinado, { idLote = '1' } = {}) {
  return (
    `<envEvento versao="1.00" xmlns="${NFE_NS}">` +
    `<idLote>${idLote}</idLote>` +
    semProlog(eventoAssinado) +
    '</envEvento>'
  );
}

/** Envelope da operação NFeRecepcaoEvento4 (cancelamento / CC-e). */
function envelopeEvento(envEventoXml) {
  const corpo = `<nfeDadosMsg xmlns="${WSDL.NFeRecepcaoEvento4}">${semProlog(envEventoXml)}</nfeDadosMsg>`;
  return { xmlEnvelope: envelope(corpo), soapAction: WSDL.NFeRecepcaoEvento4 };
}

/** Envelope da operação NFeInutilizacao4 (recebe o `inutNFe` JÁ ASSINADO). */
function envelopeInutilizacao(inutNFeAssinada) {
  const corpo = `<nfeDadosMsg xmlns="${WSDL.NFeInutilizacao4}">${semProlog(inutNFeAssinada)}</nfeDadosMsg>`;
  return { xmlEnvelope: envelope(corpo), soapAction: WSDL.NFeInutilizacao4 };
}

/**
 * Monta a mensagem `distDFeInt` da Distribuição DF-e, com UM critério de consulta:
 *  - `ultNSU` → `distNSU` (traz o próximo lote a partir do último NSU processado);
 *  - `nsu`    → `consNSU` (baixa um NSU específico);
 *  - `chNFe`  → `consChNFe` (baixa a NF-e completa por chave, se houver interesse).
 * @param {{ tpAmb:'1'|'2', cUFAutor:string|number, cnpjCpf:string, ultNSU?, nsu?, chNFe? }} p
 */
function montarDistDFeInt({ tpAmb, cUFAutor, cnpjCpf, ultNSU, nsu, chNFe }) {
  if (!cUFAutor) throw new Error('cUFAutor é obrigatório na Distribuição DF-e');
  if (!cnpjCpf) throw new Error('cnpjCpf é obrigatório na Distribuição DF-e');
  const tag = String(cnpjCpf).length === 14 ? 'CNPJ' : 'CPF';
  let consulta;
  if (chNFe) consulta = `<consChNFe><chNFe>${chNFe}</chNFe></consChNFe>`;
  else if (nsu != null) consulta = `<consNSU><NSU>${pad15(nsu)}</NSU></consNSU>`;
  else consulta = `<distNSU><ultNSU>${pad15(ultNSU)}</ultNSU></distNSU>`;
  return (
    `<distDFeInt versao="${VERSAO_DIST_DFE}" xmlns="${NFE_NS}">` +
    `<tpAmb>${tpAmb}</tpAmb><cUFAutor>${cUFAutor}</cUFAutor>` +
    `<${tag}>${cnpjCpf}</${tag}>${consulta}` +
    `</distDFeInt>`
  );
}

/**
 * Envelope da operação NFeDistribuicaoDFe. Peculiaridade: o corpo tem o wrapper
 * `<nfeDistDFeInteresse>` POR FORA do `<nfeDadosMsg>` (diferente dos demais).
 * @param {string} distDFeIntXml  resultado de montarDistDFeInt
 */
function envelopeDistribuicao(distDFeIntXml) {
  const corpo =
    `<nfeDistDFeInteresse xmlns="${WSDL.NFeDistribuicaoDFe}">` +
    `<nfeDadosMsg>${semProlog(distDFeIntXml)}</nfeDadosMsg>` +
    `</nfeDistDFeInteresse>`;
  return { xmlEnvelope: envelope(corpo), soapAction: `${WSDL.NFeDistribuicaoDFe}/nfeDistDFeInteresse` };
}

module.exports = {
  NFE_NS,
  SOAP_NS,
  WSDL,
  VERSAO_DIST_DFE,
  semProlog,
  envelope,
  montarEnviNFe,
  envelopeAutorizacao,
  envelopeStatusServico,
  montarEnvEvento,
  envelopeEvento,
  envelopeInutilizacao,
  montarDistDFeInt,
  envelopeDistribuicao,
};
