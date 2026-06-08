'use strict';

const forge = require('node-forge');

/**
 * Gera um certificado autoassinado e o empacota como PKCS#12 (.pfx) em memória.
 * Uso EXCLUSIVO de teste/desenvolvimento — jamais um certificado real.
 *
 * O CN segue o padrão ICP-Brasil "NOME:DOC" para exercitar a extração de
 * CNPJ/CPF e titular.
 */
function gerarPfxTeste({
  senha = 'teste123',
  cn = 'EMPRESA TESTE LTDA:12345678000199',
  emissor = 'AC TESTE ICP-BRASIL',
  diasValidade = 365,
  bits = 2048,
} = {}) {
  const keys = forge.pki.rsa.generateKeyPair(bits);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '0A1B2C3D';

  const agora = new Date();
  const notBefore = new Date(agora);
  notBefore.setDate(notBefore.getDate() - 1);
  const notAfter = new Date(agora);
  notAfter.setDate(notAfter.getDate() + diasValidade);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  cert.setSubject([{ name: 'commonName', value: cn }]);
  cert.setIssuer([{ name: 'commonName', value: emissor }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], senha, {
    algorithm: '3des',
  });
  const der = forge.asn1.toDer(asn1).getBytes();
  return { pfx: Buffer.from(der, 'binary'), senha, cn, emissor };
}

module.exports = { gerarPfxTeste };
