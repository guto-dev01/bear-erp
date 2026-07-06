'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { montarEnviNFe, envelopeAutorizacao, envelopeStatusServico, WSDL } = require('../nfe/soap');
const { parseRetornoAutorizacao, parseRetornoStatusServico, parseFault, classificarStatus } = require('../nfe/respostas');

const NFE_ASSINADA = '<?xml version="1.0"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe35"></infNFe><Signature>...</Signature></NFe>';

// ── Envelopes ────────────────────────────────────────────────
test('montarEnviNFe embrulha a NF-e (síncrono) e remove prolog', () => {
  const env = montarEnviNFe(NFE_ASSINADA, { idLote: '7' });
  assert.match(env, /<enviNFe versao="4.00" xmlns="http:\/\/www.portalfiscal.inf.br\/nfe">/);
  assert.match(env, /<idLote>7<\/idLote><indSinc>1<\/indSinc>/);
  assert.ok(env.includes('<NFe'), 'inclui a NF-e');
  assert.ok(!env.includes('<?xml'), 'sem prolog interno');
});

test('envelopeAutorizacao monta SOAP 1.1 com nfeDadosMsg e soapAction', () => {
  const enviNFe = montarEnviNFe(NFE_ASSINADA);
  const { xmlEnvelope, soapAction } = envelopeAutorizacao(enviNFe);
  assert.match(xmlEnvelope, /<soap:Envelope xmlns:soap="http:\/\/www.w3.org\/2003\/05\/soap-envelope">/);
  assert.ok(xmlEnvelope.includes(`<nfeDadosMsg xmlns="${WSDL.NFeAutorizacao4}">`), 'corpo é nfeDadosMsg');
  assert.ok(xmlEnvelope.includes('<enviNFe'), 'contém o enviNFe');
  assert.equal(soapAction, WSDL.NFeAutorizacao4);
});

test('envelopeStatusServico monta consStatServ com cUF e xServ STATUS', () => {
  const { xmlEnvelope, soapAction } = envelopeStatusServico({ cUF: '35', tpAmb: '2' });
  assert.match(xmlEnvelope, /<consStatServ versao="4.00"/);
  assert.match(xmlEnvelope, /<cUF>35<\/cUF>/);
  assert.match(xmlEnvelope, /<xServ>STATUS<\/xServ>/);
  assert.equal(soapAction, WSDL.NFeStatusServico4);
});

test('envelopeStatusServico exige cUF', () => {
  assert.throws(() => envelopeStatusServico({ tpAmb: '2' }), /cUF/);
});

// ── classificarStatus ───────────────────────────────────────
test('classificarStatus mapeia os principais cStat', () => {
  assert.equal(classificarStatus(100), 'AUTORIZADA');
  assert.equal(classificarStatus(150), 'AUTORIZADA');
  assert.equal(classificarStatus(302), 'DENEGADA');
  assert.equal(classificarStatus(103), 'PROCESSANDO');
  assert.equal(classificarStatus(539), 'REJEITADA');
  assert.equal(classificarStatus('xx'), 'ERRO');
});

// ── Parse do retorno de autorização ─────────────────────────
const RET_AUTORIZADA =
  '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
  '<nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">' +
  '<retEnviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">' +
  '<tpAmb>2</tpAmb><cStat>104</cStat><xMotivo>Lote processado</xMotivo>' +
  '<protNFe versao="4.00"><infProt><tpAmb>2</tpAmb>' +
  '<chNFe>35260512345678000199550010000010011000070203</chNFe>' +
  '<dhRecbto>2026-05-10T10:00:00-03:00</dhRecbto><nProt>135260000012345</nProt>' +
  '<cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe>' +
  '</retEnviNFe></nfeResultMsg></soap:Body></soap:Envelope>';

test('parseRetornoAutorizacao prioriza o cStat do protocolo (100 autorizada)', () => {
  const r = parseRetornoAutorizacao(RET_AUTORIZADA);
  assert.equal(r.cStat, 100);
  assert.equal(r.situacao, 'AUTORIZADA');
  assert.equal(r.nProt, '135260000012345');
  assert.equal(r.chNFe, '35260512345678000199550010000010011000070203');
  assert.equal(r.xMotivo, 'Autorizado o uso da NF-e');
});

const RET_REJEITADA =
  '<retEnviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">' +
  '<tpAmb>2</tpAmb><cStat>225</cStat><xMotivo>Falha no Schema XML do lote</xMotivo></retEnviNFe>';

test('parseRetornoAutorizacao usa o cStat do lote quando não há protocolo', () => {
  const r = parseRetornoAutorizacao(RET_REJEITADA);
  assert.equal(r.cStat, 225);
  assert.equal(r.situacao, 'REJEITADA');
  assert.equal(r.nProt, null);
});

// ── Status do serviço ───────────────────────────────────────
test('parseRetornoStatusServico detecta serviço online (cStat 107)', () => {
  const xml =
    '<retConsStatServ versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">' +
    '<tpAmb>2</tpAmb><cStat>107</cStat><xMotivo>Servico em Operacao</xMotivo></retConsStatServ>';
  const r = parseRetornoStatusServico(xml);
  assert.equal(r.cStat, 107);
  assert.equal(r.online, true);
});

// ── Fault ───────────────────────────────────────────────────
test('parseFault detecta soap:Fault', () => {
  const xml =
    '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
    '<soap:Fault><faultcode>soap:Server</faultcode><faultstring>Erro interno</faultstring></soap:Fault>' +
    '</soap:Body></soap:Envelope>';
  const f = parseFault(xml);
  assert.ok(f);
  assert.equal(f.faultstring, 'Erro interno');
  assert.equal(parseFault(RET_REJEITADA), null);
});
