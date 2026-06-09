'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { getConfig, resolverAmbiente, AMBIENTE } = require('../config/environment');

test('default é produção restrita quando não configurado', () => {
  const c = getConfig({});
  assert.equal(c.ambiente, AMBIENTE.PRODUCAO_RESTRITA);
  assert.equal(c.ambienteNome, 'producao-restrita');
  assert.equal(c.producao, false);
  assert.equal(c.tpAmb, 2);
  assert.match(c.endpoints.enviarLote, /producaorestrita\.esocial\.gov\.br/);
  assert.match(c.endpoints.consultarLote, /WsConsultarLoteEventos\.svc$/);
});

test('produção é selecionada por número ou nome', () => {
  assert.equal(resolverAmbiente({ ESOCIAL_AMBIENTE: '1' }), AMBIENTE.PRODUCAO);
  assert.equal(resolverAmbiente({ ESOCIAL_AMBIENTE: 'producao' }), AMBIENTE.PRODUCAO);
  assert.equal(resolverAmbiente({ ESOCIAL_AMBIENTE: 'produção' }), AMBIENTE.PRODUCAO);

  const c = getConfig({ ESOCIAL_AMBIENTE: '1' });
  assert.equal(c.producao, true);
  assert.equal(c.tpAmb, 1);
  assert.match(c.endpoints.enviarLote, /^https:\/\/webservices\.esocial\.gov\.br/);
});

test('valor desconhecido cai em restrita (seguro por padrão)', () => {
  assert.equal(resolverAmbiente({ ESOCIAL_AMBIENTE: 'sei-la' }), AMBIENTE.PRODUCAO_RESTRITA);
});

test('versão de leiaute e dias de alerta são parametrizáveis', () => {
  const c = getConfig({ ESOCIAL_VERSAO_LEIAUTE: 'S-1.4', CERT_DIAS_ALERTA_VENCIMENTO: '45' });
  assert.equal(c.versaoLeiaute, 'S-1.4');
  assert.equal(c.diasAlertaCertificado, 45);
});

test('versão de leiaute default é S-1.3', () => {
  assert.equal(getConfig({}).versaoLeiaute, 'S-1.3');
});
