// Testa o fluxo do "Lançar" da tela Teste Bear ponta a ponta, replicando a lógica
// real do componente + service (sem navegador). Cria um lançamento de teste e o APAGA.
//
//   node scripts/test-fluxo-lancamento.js
//
const { Client, Databases, Query, ID } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim();
  }
}
loadEnv();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const DB = process.env.APPWRITE_DB_ID;
const EMPRESA_ID = '6a299904003b32e2895d'; // BEAR FINANCE
const TENANT_ID = 'default';

let pass = 0, fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); cond ? pass++ : fail++; };

// ── Réplica EXATA da lógica do componente (teste-bear.component.ts) ──
const somaPartidas = (partidas, tipo) =>
  partidas.filter(p => p.tipo === tipo).reduce((s, p) => s + (Number(p.valor) || 0), 0);
const partidasBatem = (partidas) => {
  const d = somaPartidas(partidas, 'DEBITO'), c = somaPartidas(partidas, 'CREDITO');
  return d > 0 && Math.abs(d - c) < 0.01;
};
// salvarLancamento(): if (lancForm.invalid || !partidasBatem()) return;
const formValido = (partidas) => partidas.every(p => p.contaId && Number(p.valor) > 0);
const podeClicarLancar = (partidas) => formValido(partidas) && partidasBatem(partidas);

// ── Réplica do service.buildLancamentoPayload ──
const buildLancamentoPayload = (data, numero) => {
  const partidas = data.partidas ?? [];
  const deb = partidas.find(p => p.tipo === 'DEBITO');
  const cred = partidas.find(p => p.tipo === 'CREDITO');
  const dataStr = data.data;
  return {
    numero, data: dataStr, tipo: data.tipo ?? 'NORMAL', historico: data.historico,
    valor: Number(deb?.valor ?? cred?.valor ?? 0),
    contaDebitoId: deb.contaId, contaCreditoId: cred.contaId,
    competencia: dataStr.slice(0, 7), status: 'NORMAL',
    tenantId: TENANT_ID, empresaId: EMPRESA_ID,
  };
};

(async () => {
  // Pega IDs reais de duas contas analíticas da BEAR FINANCE.
  const contas = await db.listDocuments(DB, 'plano_contas', [
    Query.equal('empresaId', EMPRESA_ID), Query.equal('aceitaLancamento', true), Query.limit(100),
  ]);
  const byCod = new Map(contas.documents.map(c => [c.codigo, c.$id]));
  const CAIXA = byCod.get('1.1.01');   // débito (ativo)
  const RECEITA = byCod.get('4.1');    // crédito (receita)
  ok(!!CAIXA && !!RECEITA, `Contas analíticas carregadas (1.1.01 e 4.1 existem para BEAR FINANCE)`);

  console.log('\n── 1) GATE: lançamento DESBALANCEADO deve ser bloqueado ──');
  const desbalanceado = [
    { contaId: CAIXA, tipo: 'DEBITO', valor: 10212000 },
    { contaId: RECEITA, tipo: 'CREDITO', valor: 10000000 },
  ];
  ok(!partidasBatem(desbalanceado), 'partidasBatem() = false (débito ≠ crédito) → badge "Não fecha"');
  ok(!podeClicarLancar(desbalanceado), 'Botão "Lançar" DESABILITADO (nada é gravado) — bloqueio correto');

  console.log('\n── 2) GATE: conta não selecionada deve ser bloqueado ──');
  const semConta = [
    { contaId: '', tipo: 'DEBITO', valor: 5000 },
    { contaId: RECEITA, tipo: 'CREDITO', valor: 5000 },
  ];
  ok(!podeClicarLancar(semConta), 'Botão "Lançar" DESABILITADO quando falta "Conta analítica"');

  console.log('\n── 3) HAPPY PATH: lançamento BALANCEADO grava no Appwrite ──');
  const partidas = [
    { contaId: CAIXA, tipo: 'DEBITO', valor: 5000 },
    { contaId: RECEITA, tipo: 'CREDITO', valor: 5000 },
  ];
  ok(podeClicarLancar(partidas), 'partidasBatem() = true + form válido → botão "Lançar" HABILITADO');

  const form = { data: '2026-06-23', historico: 'TESTE AUTOMÁTICO DE FLUXO (apagar)', tipo: 'NORMAL', partidas };

  // nextNumero(): maior numero existente + 1 (escopo tenant+empresa)
  const ult = await db.listDocuments(DB, 'lancamentos', [
    Query.equal('empresaId', EMPRESA_ID), Query.orderDesc('numero'), Query.limit(1),
  ]);
  const numero = (ult.documents[0]?.numero ?? 0) + 1;
  console.log(`   nextNumero() = ${numero}`);

  const payload = buildLancamentoPayload(form, numero);
  const criado = await db.createDocument(DB, 'lancamentos', ID.unique(), payload);
  ok(!!criado.$id, `createDocument OK → $id=${criado.$id}, numero=${criado.numero}`);

  // Leitura de volta (prova que persistiu e está consultável)
  const lido = await db.getDocument(DB, 'lancamentos', criado.$id);
  ok(lido.valor === 5000 && lido.contaDebitoId === CAIXA && lido.contaCreditoId === RECEITA && lido.status === 'NORMAL',
    `Lido de volta: valor=R$${lido.valor}, D=${lido.contaDebitoCodigo || '1.1.01'}, C=${lido.contaCreditoCodigo || '4.1'}, status=${lido.status}`);

  // Aparece na listagem que a aba "Lançados" usa (orderDesc numero)
  const listado = await db.listDocuments(DB, 'lancamentos', [
    Query.equal('empresaId', EMPRESA_ID), Query.orderDesc('numero'), Query.limit(1),
  ]);
  ok(listado.documents[0]?.$id === criado.$id, 'Aparece no topo da lista de "Lançados"');

  // ── CLEANUP: remove o lançamento de teste ──
  await db.deleteDocument(DB, 'lancamentos', criado.$id);
  const aindaExiste = await db.getDocument(DB, 'lancamentos', criado.$id).then(() => true).catch(() => false);
  ok(!aindaExiste, 'Cleanup: lançamento de teste removido (dados intactos)');

  console.log(`\n${fail === 0 ? '🎉' : '⚠️'}  Resultado: ${pass} passou, ${fail} falhou.`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
