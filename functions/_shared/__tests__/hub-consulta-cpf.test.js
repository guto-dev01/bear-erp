'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  consultarCpf,
  cpfValido,
  normalizarResultado,
  dataParaIso,
} = require('../hub/consulta-cpf');

// CPF de teste válido (dígitos verificadores corretos).
const CPF_VALIDO = '11144477735';

/** httpClient falso estilo fetch: registra a URL chamada e devolve `corpo`. */
function fakeHttp(corpo, { ok = true, status = 200 } = {}) {
  const chamadas = [];
  const fn = async (url) => {
    chamadas.push(url);
    return { ok, status, json: async () => corpo };
  };
  fn.chamadas = chamadas;
  return fn;
}

test('cpfValido valida dígitos verificadores e rejeita repetidos', () => {
  assert.equal(cpfValido(CPF_VALIDO), true);
  assert.equal(cpfValido('111.444.777-35'), true);
  assert.equal(cpfValido('00000000000'), false);
  assert.equal(cpfValido('12345678900'), false);
  assert.equal(cpfValido('123'), false);
});

test('dataParaIso converte dd/mm/aaaa em aaaa-mm-dd', () => {
  assert.equal(dataParaIso('15/05/1990'), '1990-05-15');
  assert.equal(dataParaIso('1990-05-15'), '1990-05-15');
  assert.equal(dataParaIso('texto'), 'texto');
});

test('normalizarResultado mapeia nomes do Hub e converte data', () => {
  const n = normalizarResultado({
    numero_de_cpf: '111.444.777-35',
    nome_da_pf: 'FULANO DE TAL',
    data_nascimento: '15/05/1990',
    situacao_cadastral: 'REGULAR',
  });
  assert.equal(n.cpf, CPF_VALIDO);
  assert.equal(n.nome, 'FULANO DE TAL');
  assert.equal(n.dataNascimento, '1990-05-15');
  assert.equal(n.situacaoCadastral, 'REGULAR');
});

test('consultarCpf rejeita CPF inválido antes de chamar a rede', async () => {
  const http = fakeHttp({});
  await assert.rejects(
    () => consultarCpf({ cpf: '12345678900', token: 't', httpClient: http }),
    /CPF inválido/,
  );
  assert.equal(http.chamadas.length, 0);
});

test('consultarCpf exige token', async () => {
  await assert.rejects(
    () => consultarCpf({ cpf: CPF_VALIDO, token: '', httpClient: fakeHttp({}) }),
    /Token/,
  );
});

test('consultarCpf monta URL com cpf+token e normaliza o resultado', async () => {
  const http = fakeHttp({
    status: true,
    return: 'OK',
    result: { numero_de_cpf: CPF_VALIDO, nome_da_pf: 'FULANO', data_nascimento: '15/05/1990' },
  });
  const r = await consultarCpf({
    cpf: '111.444.777-35',
    dataNascimento: '1990-05-15',
    token: 'tok123',
    url: 'https://exemplo/cpf/',
    httpClient: http,
  });
  const url = http.chamadas[0];
  assert.match(url, /cpf=11144477735/);
  assert.match(url, /token=tok123/);
  assert.match(url, /data=15%2F05%2F1990/); // dd/mm/aaaa url-encoded
  assert.equal(r.normalizado.nome, 'FULANO');
  assert.equal(r.normalizado.dataNascimento, '1990-05-15');
  assert.equal(r.bruto.nome_da_pf, 'FULANO');
});

test('consultarCpf trata retorno lógico NOK do Hub como não encontrado', async () => {
  const http = fakeHttp({ status: false, return: 'NOK', message: 'CPF não localizado' });
  await assert.rejects(
    () => consultarCpf({ cpf: CPF_VALIDO, token: 't', httpClient: http }),
    (e) => e.codigo === 'NAO_ENCONTRADO' && /não localizado/.test(e.message),
  );
});

test('consultarCpf propaga erro HTTP do Hub', async () => {
  const http = fakeHttp({}, { ok: false, status: 500 });
  await assert.rejects(
    () => consultarCpf({ cpf: CPF_VALIDO, token: 't', httpClient: http }),
    (e) => e.codigo === 'HTTP' && e.httpStatus === 500,
  );
});
