'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  validarCpf,
  validarNis,
  nomeConsistente,
  qualificarLocal,
  consultarOficial,
} = require('../esocial/qualificacao/qualificacao-cadastral');

// CPF válido conhecido (DV correto): 529.982.247-25.
const CPF_OK = '52998224725';
// NIS/PIS com DV correto (calculado: base 1234567890 → DV 0).
const NIS_OK = '12345678900';

test('validarCpf aceita CPF com DV correto e rejeita o resto', () => {
  assert.equal(validarCpf(CPF_OK), true);
  assert.equal(validarCpf('529.982.247-25'), true); // aceita máscara
  assert.equal(validarCpf('11111111111'), false); // sequência repetida
  assert.equal(validarCpf('52998224724'), false); // DV errado (CPF_OK com último dígito trocado)
  assert.equal(validarCpf('123'), false); // curto
  assert.equal(validarCpf(undefined), false);
});

test('validarNis aceita NIS com DV correto e rejeita o resto', () => {
  assert.equal(validarNis(NIS_OK), true);
  assert.equal(validarNis('123.45678.90-0'), true); // aceita máscara
  assert.equal(validarNis('12345678901'), false); // DV errado
  assert.equal(validarNis('00000000000'), false); // sequência repetida
  assert.equal(validarNis('123'), false);
});

test('nomeConsistente exige nome completo sem caracteres inválidos', () => {
  assert.equal(nomeConsistente('Maria Silva'), true);
  assert.equal(nomeConsistente('Ana'), false); // uma palavra só
  assert.equal(nomeConsistente('Jo'), false); // curto
  assert.equal(nomeConsistente('Maria S1lva'), false); // dígito
  assert.equal(nomeConsistente('Maria@Silva'), false); // símbolo
});

test('qualificarLocal aprova cadastro consistente', () => {
  const r = qualificarLocal({ cpf: CPF_OK, nome: 'Maria da Silva', nis: NIS_OK });
  assert.equal(r.cpfValido, true);
  assert.equal(r.nisValido, true);
  assert.equal(r.nomeConsistente, true);
  assert.equal(r.qualificado, true);
  assert.equal(r.divergencias.length, 0);
  assert.match(r.recomendacao, /apto para envio/);
});

test('qualificarLocal acumula divergências e reprova', () => {
  const r = qualificarLocal({ cpf: '52998224724', nome: 'Ana', nis: '123' });
  assert.equal(r.qualificado, false);
  assert.equal(r.divergencias.length, 3);
  assert.match(r.divergencias.join(' '), /CPF inválido/);
  assert.match(r.divergencias.join(' '), /NIS\/PIS inválido/);
  assert.match(r.divergencias.join(' '), /Nome incompleto/);
  assert.match(r.recomendacao, /Qualificação Cadastral oficial/);
});

test('consultarOficial lança PENDENTE_CONFIG sem endpoint configurado', async () => {
  await assert.rejects(
    () => consultarOficial({ cpf: CPF_OK, nome: 'Maria da Silva', nis: NIS_OK, env: {} }),
    (e) => {
      assert.equal(e.codigo, 'PENDENTE_CONFIG');
      assert.match(e.message, /ESOCIAL_QUALIF_WS_URL/);
      return true;
    },
  );
});

test('consultarOficial não finge sucesso mesmo com URL configurada (impl pendente)', async () => {
  await assert.rejects(
    () => consultarOficial({ cpf: CPF_OK, nome: 'Maria da Silva', nis: NIS_OK, env: { ESOCIAL_QUALIF_WS_URL: 'https://exemplo' } }),
    (e) => {
      assert.equal(e.codigo, 'PENDENTE_IMPL');
      return true;
    },
  );
});
