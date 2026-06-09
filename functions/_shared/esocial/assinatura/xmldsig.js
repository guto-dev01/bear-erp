'use strict';

const { SignedXml } = require('xml-crypto');

/**
 * Assinatura XMLDSig de um evento do eSocial.
 *
 * Exigências do eSocial (Parte 3):
 *  - Certificado A1 (PKCS#12) da cadeia ICP-Brasil; aqui recebemos o material já
 *    extraído (PEM da chave privada + PEM do certificado folha).
 *  - SignatureMethod: RSA-SHA256.
 *  - DigestMethod: SHA-256.
 *  - Canonicalização: C14N inclusiva (REC-xml-c14n-20010315).
 *  - Transforms: enveloped-signature + C14N.
 *  - KeyInfo deve conter APENAS <X509Certificate> (sem subjectName/issuerSerial).
 *
 * Estratégia: assina o elemento do evento (o que possui atributo @Id), com a
 * <Signature> anexada como último filho desse mesmo elemento (enveloped), e
 * Reference URI="#<Id>".
 *
 * Observação: o material (chave privada) NUNCA é logado. A correção
 * criptográfica é verificável offline (ver testes); a aderência ao XSD/WS deve
 * ser confirmada em produção restrita (Etapa 3, config externa pendente).
 */

const ALG = Object.freeze({
  assinatura: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  c14n: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  enveloped: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
  digest: 'http://www.w3.org/2001/04/xmlenc#sha256',
});

/** Remove cabeçalho/rodapé PEM e quebras — KeyInfo carrega só o base64 do DER. */
function certParaBase64(pem) {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
}

/**
 * @param {string} xmlEvento  XML do evento <eSocial>…</eSocial> (sem assinatura)
 * @param {object} material
 * @param {string} material.privateKeyPem
 * @param {string} material.leafPem        certificado folha (PEM)
 * @returns {string} XML do evento assinado
 */
function assinarEvento(xmlEvento, material) {
  if (!material?.privateKeyPem || !material?.leafPem) {
    throw new Error('Material do certificado ausente (privateKeyPem/leafPem)');
  }

  const certB64 = certParaBase64(material.leafPem);

  const sig = new SignedXml({
    privateKey: material.privateKeyPem,
    publicCert: material.leafPem,
    signatureAlgorithm: ALG.assinatura,
    canonicalizationAlgorithm: ALG.c14n,
    // KeyInfo SÓ com X509Certificate, como o eSocial exige.
    getKeyInfoContent: () => `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`,
  });

  sig.addReference({
    // O elemento do evento é o único com atributo @Id.
    xpath: "//*[@Id]",
    transforms: [ALG.enveloped, ALG.c14n],
    digestAlgorithm: ALG.digest,
  });

  sig.computeSignature(xmlEvento, {
    // <Signature> como último filho do próprio elemento do evento (enveloped).
    location: { reference: "//*[@Id]", action: 'append' },
  });

  return sig.getSignedXml();
}

/**
 * Verifica a assinatura de um evento (uso em testes/diagnóstico).
 * @param {string} xmlAssinado
 * @param {string} leafPem
 * @returns {boolean}
 */
function verificarAssinatura(xmlAssinado, leafPem) {
  const { DOMParser } = require('@xmldom/xmldom');
  const doc = new DOMParser().parseFromString(xmlAssinado, 'text/xml');
  const signatures = doc.getElementsByTagNameNS(
    'http://www.w3.org/2000/09/xmldsig#',
    'Signature',
  );
  if (signatures.length === 0) return false;
  const sig = new SignedXml({ publicCert: leafPem });
  sig.loadSignature(signatures[0]);
  return sig.checkSignature(xmlAssinado);
}

module.exports = { assinarEvento, verificarAssinatura, ALG };
