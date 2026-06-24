'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { assinarNfe, verificarAssinatura } = require('../nfe/assinatura');
const { lerPkcs12 } = require('../certificado/pkcs12');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

const CHAVE = '35260512345678000199550010000010011000070203';
const NFE = `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe">` +
  `<infNFe Id="NFe${CHAVE}" versao="4.00"><ide><cUF>35</cUF><nNF>1001</nNF></ide></infNFe></NFe>`;

function material() {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  return { leafPem, privateKeyPem };
}

test('assinarNfe produz uma assinatura criptograficamente válida', () => {
  const mat = material();
  const assinada = assinarNfe(NFE, mat);
  assert.equal(verificarAssinatura(assinada, mat.leafPem), true);
});

test('assinatura referencia o infNFe pela chave (URI #NFe<chave>)', () => {
  const assinada = assinarNfe(NFE, material());
  assert.ok(assinada.includes(`URI="#NFe${CHAVE}"`), 'Reference URI aponta para o Id do infNFe');
});

test('KeyInfo contém apenas o X509Certificate', () => {
  const assinada = assinarNfe(NFE, material());
  assert.ok(assinada.includes('<X509Certificate>'), 'tem X509Certificate');
  assert.ok(!/<X509SubjectName>|<X509IssuerSerial>/.test(assinada), 'sem subjectName/issuerSerial');
});

test('Signature é irmã do infNFe (logo após ele, dentro de <NFe>)', () => {
  const assinada = assinarNfe(NFE, material());
  const fimInfNFe = assinada.indexOf('</infNFe>');
  const inicioSig = assinada.search(/<(\w+:)?Signature[ >]/);
  const fimNFe = assinada.lastIndexOf('</NFe>');
  assert.ok(fimInfNFe !== -1 && inicioSig !== -1 && fimNFe !== -1, 'elementos presentes');
  assert.ok(fimInfNFe < inicioSig, 'Signature vem depois do infNFe');
  assert.ok(inicioSig < fimNFe, 'Signature está dentro do NFe');
});

test('usa RSA-SHA1 e digest SHA-1 (exigência da NF-e)', () => {
  const assinada = assinarNfe(NFE, material());
  assert.ok(assinada.includes('xmldsig#rsa-sha1'), 'SignatureMethod rsa-sha1');
  assert.ok(assinada.includes('xmldsig#sha1'), 'DigestMethod sha1');
});

test('falha claramente sem material de certificado', () => {
  assert.throws(() => assinarNfe(NFE, {}), /Material do certificado ausente/);
});

test('uma assinatura inválida (cert trocado) é rejeitada na verificação', () => {
  const assinada = assinarNfe(NFE, material());
  const outro = material(); // par de chaves diferente
  assert.equal(verificarAssinatura(assinada, outro.leafPem), false);
});
