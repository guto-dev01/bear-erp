'use strict';

const forge = require('node-forge');

/**
 * Leitura de um certificado A1 em formato PKCS#12 (.pfx/.p12).
 *
 * Extrai o certificado folha (o que casa com a chave privada), a cadeia
 * (intermediárias/raiz embutidas) e a chave privada — tudo em PEM, em memória.
 * NÃO persiste nada. NÃO loga. A senha é usada só para abrir o container.
 */

/** Compara o módulo RSA da chave privada com o da pública de um certificado. */
function casaChave(cert, chavePrivada) {
  try {
    return (
      cert.publicKey &&
      chavePrivada.n &&
      cert.publicKey.n &&
      cert.publicKey.n.toString(16) === chavePrivada.n.toString(16)
    );
  } catch {
    return false;
  }
}

/** Extrai o CNPJ/CPF do titular a partir do CN no padrão ICP-Brasil "NOME:DOC". */
function extrairCnpjCpf(commonName) {
  if (!commonName) return null;
  const idx = commonName.lastIndexOf(':');
  if (idx === -1) return null;
  const doc = commonName.slice(idx + 1).replace(/\D/g, '');
  return doc.length === 11 || doc.length === 14 ? doc : null;
}

/** Nome do titular sem o sufixo ":DOC" do padrão ICP-Brasil. */
function extrairTitular(commonName) {
  if (!commonName) return null;
  const idx = commonName.lastIndexOf(':');
  return idx === -1 ? commonName : commonName.slice(0, idx);
}

function cn(attrs) {
  const a = attrs?.getField?.('CN');
  return a ? a.value : null;
}

/**
 * @param {Buffer|Uint8Array} pfxBuffer  Conteúdo binário do .pfx.
 * @param {string} senha
 * @returns {{
 *   leafPem: string,
 *   privateKeyPem: string,
 *   chainPem: string[],
 *   titular: string|null,
 *   cnpjCpf: string|null,
 *   serialNumber: string,
 *   emissor: string|null,
 *   validoDe: Date,
 *   validoAte: Date,
 * }}
 */
function lerPkcs12(pfxBuffer, senha) {
  if (!pfxBuffer || pfxBuffer.length === 0) {
    throw new Error('PKCS#12 vazio');
  }
  const buf = Buffer.isBuffer(pfxBuffer) ? pfxBuffer : Buffer.from(pfxBuffer);

  let p12;
  try {
    const der = forge.util.createBuffer(buf.toString('binary'));
    const asn1 = forge.asn1.fromDer(der);
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);
  } catch (e) {
    // Senha errada ou arquivo corrompido caem aqui — mensagem sem vazar senha.
    throw new Error(`Falha ao abrir PKCS#12 (senha incorreta ou arquivo inválido): ${e.message}`);
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []),
  ];

  if (certBags.length === 0) throw new Error('PKCS#12 sem certificados');
  if (keyBags.length === 0) throw new Error('PKCS#12 sem chave privada');

  const chavePrivada = keyBags[0].key;
  const certs = certBags.map((b) => b.cert).filter(Boolean);

  let leaf = certs.find((c) => casaChave(c, chavePrivada));
  if (!leaf) leaf = certs[0]; // fallback: assume o primeiro como folha
  const cadeia = certs.filter((c) => c !== leaf);

  const cnTitular = cn(leaf.subject);

  return {
    leafPem: forge.pki.certificateToPem(leaf),
    privateKeyPem: forge.pki.privateKeyToPem(chavePrivada),
    chainPem: cadeia.map((c) => forge.pki.certificateToPem(c)),
    titular: extrairTitular(cnTitular),
    cnpjCpf: extrairCnpjCpf(cnTitular),
    serialNumber: leaf.serialNumber,
    emissor: cn(leaf.issuer),
    validoDe: leaf.validity.notBefore,
    validoAte: leaf.validity.notAfter,
  };
}

module.exports = { lerPkcs12, extrairCnpjCpf, extrairTitular };
