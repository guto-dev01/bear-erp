'use strict';

const { SignedXml } = require('xml-crypto');

/**
 * Assinatura XMLDSig da NF-e (modelo 55, layout 4.00).
 *
 * Exigências da NF-e (MOC, Anexo I) — diferem do eSocial:
 *  - SignatureMethod: RSA-SHA1  (eSocial usa SHA-256);
 *  - DigestMethod: SHA-1;
 *  - Canonicalização: C14N inclusiva (REC-xml-c14n-20010315);
 *  - Transforms: enveloped-signature + C14N;
 *  - Reference URI = "#NFe<chave>" (o atributo @Id do `infNFe`);
 *  - KeyInfo só com <X509Certificate>;
 *  - A `<Signature>` é IRMÃ do `infNFe` (filha do `<NFe>`), logo após o infNFe.
 *
 * O material (chave privada) NUNCA é logado. A correção criptográfica é
 * verificável offline (ver testes); a aderência ao XSD/WS confirma-se em
 * produção restrita com o A1 real.
 */

const ALG = Object.freeze({
  assinatura: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
  c14n: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  enveloped: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
  digest: 'http://www.w3.org/2000/09/xmldsig#sha1',
});

/** Remove cabeçalho/rodapé PEM e quebras — KeyInfo carrega só o base64 do DER. */
function certParaBase64(pem) {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
}

/**
 * Assina a NF-e. A `<Signature>` referencia o `infNFe` (URI #NFe<chave>) e é
 * anexada logo após ele, dentro do `<NFe>`.
 * @param {string} xmlNFe  XML `<NFe>…<infNFe Id="NFe<chave>">…</infNFe></NFe>`
 * @param {{ privateKeyPem: string, leafPem: string }} material
 * @returns {string} XML da NF-e assinada
 */
function assinarNfe(xmlNFe, material) {
  if (!material?.privateKeyPem || !material?.leafPem) {
    throw new Error('Material do certificado ausente (privateKeyPem/leafPem)');
  }
  const limpo = String(xmlNFe).replace(/<\?xml[^>]*\?>/g, '').trim();
  const certB64 = certParaBase64(material.leafPem);

  const sig = new SignedXml({
    privateKey: material.privateKeyPem,
    publicCert: material.leafPem,
    signatureAlgorithm: ALG.assinatura,
    canonicalizationAlgorithm: ALG.c14n,
    getKeyInfoContent: () => `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`,
  });

  sig.addReference({
    // infNFe é o elemento assinado; xml-crypto deriva a URI do seu @Id.
    xpath: "//*[local-name(.)='infNFe']",
    transforms: [ALG.enveloped, ALG.c14n],
    digestAlgorithm: ALG.digest,
  });

  sig.computeSignature(limpo, {
    // <Signature> logo após o infNFe (irmã), dentro do <NFe>.
    location: { reference: "//*[local-name(.)='infNFe']", action: 'after' },
  });

  return sig.getSignedXml();
}

/**
 * Verifica a assinatura (uso em testes/diagnóstico).
 * @param {string} xmlAssinado
 * @param {string} leafPem
 * @returns {boolean}
 */
function verificarAssinatura(xmlAssinado, leafPem) {
  const { DOMParser } = require('@xmldom/xmldom');
  const doc = new DOMParser().parseFromString(xmlAssinado, 'text/xml');
  const sigs = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
  if (sigs.length === 0) return false;
  const sig = new SignedXml({ publicCert: leafPem });
  sig.loadSignature(sigs[0]);
  // checkSignature lança em assinatura inválida; aqui queremos um booleano.
  try {
    return sig.checkSignature(xmlAssinado);
  } catch {
    return false;
  }
}

module.exports = { assinarNfe, verificarAssinatura, ALG };
