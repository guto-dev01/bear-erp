'use strict';

/**
 * Envelopes SOAP 1.1 dos WebServices da NF-e (modelo 55, layout 4.00).
 *
 * É SOAP 1.1 (não 1.2): namespace http://schemas.xmlsoap.org/soap/envelope/ e
 * Content-Type text/xml. O corpo de cada operação é o elemento `nfeDadosMsg`
 * no namespace do WSDL do serviço, contendo o XML da mensagem (enviNFe,
 * consStatServ, …).
 *
 * Módulo PURO: só monta strings. A assinatura e o transporte (mTLS) ficam no
 * orquestrador (transmissao.js).
 */

const NFE_NS = 'http://www.portalfiscal.inf.br/nfe';
const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/';

/** Namespaces dos WSDL por serviço (usados no nfeDadosMsg e no SOAPAction). */
const WSDL = Object.freeze({
  NFeAutorizacao4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
  NFeRetAutorizacao4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4',
  NFeStatusServico4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4',
  NFeRecepcaoEvento4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4',
  NFeInutilizacao4: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4',
});

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

module.exports = {
  NFE_NS,
  SOAP_NS,
  WSDL,
  semProlog,
  envelope,
  montarEnviNFe,
  envelopeAutorizacao,
  envelopeStatusServico,
  montarEnvEvento,
  envelopeEvento,
  envelopeInutilizacao,
};
