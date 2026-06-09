'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { gerarId } = require('../esocial/ids');
const { montarS1000 } = require('../esocial/eventos/s1000');
const { assinarEvento, verificarAssinatura } = require('../esocial/assinatura/xmldsig');
const { lerPkcs12 } = require('../certificado/pkcs12');
const { gerarPfxTeste } = require('./helpers/gera-pfx');

// ── Id do evento ─────────────────────────────────────────────────────────────
test('gerarId produz 36 chars no formato oficial', () => {
  const data = new Date('2026-06-08T13:45:30');
  const id = gerarId({ tpInsc: 1, nrInsc: '12345678', data, sequencial: 1 });
  assert.equal(id.length, 36);
  // ID + 1 + 12345678000000(14) + 20260608134530 + 00001
  assert.equal(id, 'ID112345678000000' + '20260608134530' + '00001');
});

test('gerarId valida tpInsc e sequencial', () => {
  const data = new Date('2026-06-08T00:00:00');
  assert.throws(() => gerarId({ tpInsc: 3, nrInsc: '1', data }), /tpInsc/);
  assert.throws(() => gerarId({ tpInsc: 1, nrInsc: '1', data, sequencial: 0 }), /sequencial/);
});

// ── Montagem do S-1000 ───────────────────────────────────────────────────────
const dadosS1000 = {
  tpAmb: 2,
  tpInsc: 1,
  nrInsc: '12345678',
  iniValid: '2026-06',
  infoCadastro: { classTrib: '01', indCoop: 0, indConstr: 0, indDesFolha: 0, indOptRegEletron: 1 },
};

test('montarS1000 gera XML bem-formado com namespace de leiaute', () => {
  const { xml, id } = montarS1000(dadosS1000, { data: new Date('2026-06-08T10:00:00') });
  assert.match(xml, /^<eSocial xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/evtInfoEmpregador\/v_S_01_03_00">/);
  assert.match(xml, /<evtInfoEmpregador Id="ID1/);
  assert.match(xml, new RegExp(`Id="${id}"`));
  assert.match(xml, /<tpAmb>2<\/tpAmb>/);
  assert.match(xml, /<classTrib>01<\/classTrib>/);
  // campo opcional ausente não aparece
  assert.doesNotMatch(xml, /fimValid/);
});

test('montarS1000 rejeita dados incompletos', () => {
  assert.throws(() => montarS1000({ ...dadosS1000, iniValid: '2026' }), /iniValid/);
  assert.throws(() => montarS1000({ ...dadosS1000, infoCadastro: {} }), /classTrib/);
});

test('montarS1000 escapa caracteres especiais em valores', () => {
  const { xml } = montarS1000(
    { ...dadosS1000, verProc: 'Bear & Co <v1>' },
    { data: new Date('2026-06-08T10:00:00') },
  );
  assert.match(xml, /<verProc>Bear &amp; Co &lt;v1&gt;<\/verProc>/);
});

// ── Assinatura XMLDSig ───────────────────────────────────────────────────────
test('assinarEvento gera assinatura válida e verificável', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS1000(dadosS1000, { data: new Date('2026-06-08T10:00:00') });

  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });

  assert.match(assinado, /<(\w+:)?Signature/);
  assert.equal(verificarAssinatura(assinado, leafPem), true);
});

test('assinatura usa SHA-256, RSA-SHA256, C14N e KeyInfo só com X509Certificate', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS1000(dadosS1000, { data: new Date('2026-06-08T10:00:00') });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });

  assert.match(assinado, /xmldsig-more#rsa-sha256/);
  assert.match(assinado, /xmlenc#sha256/);
  assert.match(assinado, /REC-xml-c14n-20010315/);
  assert.match(assinado, /enveloped-signature/);
  // KeyInfo deve ter X509Certificate e NÃO ter X509SubjectName/X509IssuerSerial
  assert.match(assinado, /<X509Certificate>/);
  assert.doesNotMatch(assinado, /X509SubjectName/);
  assert.doesNotMatch(assinado, /X509IssuerSerial/);
});

test('assinatura quebra se o XML for adulterado após assinar', () => {
  const { pfx, senha } = gerarPfxTeste();
  const { leafPem, privateKeyPem } = lerPkcs12(pfx, senha);
  const { xml } = montarS1000(dadosS1000, { data: new Date('2026-06-08T10:00:00') });
  const assinado = assinarEvento(xml, { privateKeyPem, leafPem });

  const adulterado = assinado.replace('<classTrib>01</classTrib>', '<classTrib>99</classTrib>');
  assert.equal(verificarAssinatura(adulterado, leafPem), false);
});

test('assinarEvento exige material do certificado', () => {
  assert.throws(() => assinarEvento('<eSocial/>', {}), /Material do certificado ausente/);
});
