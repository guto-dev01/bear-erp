// Testa o fluxo do "Lançamento Simplificado" (partida única) replicando a lógica
// real: salvarSimplificado() → createLancamento({contaDebitoId,contaCreditoId,valor})
// → buildLancamentoPayload (ramo SEM partidas). Cria e APAGA o lançamento de teste.
const { Client, Databases, Query, ID } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
for (const l of fs.readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const t = l.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i < 0) continue;
  const k = t.slice(0, i).trim(); if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim();
}
const db = new Databases(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY));
const DB = process.env.APPWRITE_DB_ID, EMPRESA_ID = '6a299904003b32e2895d', TENANT_ID = 'default';
let pass = 0, fail = 0;
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); c ? pass++ : fail++; };

// Réplica do gate de salvarSimplificado(): simplesForm.invalid || simplesMesmaConta()
const formValido = (f) => !!f.data && !!f.historico && !!f.contaDebitoId && !!f.contaCreditoId && Number(f.valor) >= 0.01;
const mesmaConta = (f) => !!f.contaDebitoId && f.contaDebitoId === f.contaCreditoId;
const podeLancar = (f) => formValido(f) && !mesmaConta(f);

// Réplica do buildLancamentoPayload — ramo SEM partidas (caminho do Simplificado).
const buildPayload = (data, numero) => ({
  numero, data: data.data, tipo: data.tipo ?? 'NORMAL', historico: data.historico,
  valor: Number(data.valor ?? 0),
  contaDebitoId: data.contaDebitoId ?? '', contaCreditoId: data.contaCreditoId ?? '',
  competencia: data.data.slice(0, 7), status: 'NORMAL', tenantId: TENANT_ID, empresaId: EMPRESA_ID,
});

(async () => {
  const contas = await db.listDocuments(DB, 'plano_contas', [
    Query.equal('empresaId', EMPRESA_ID), Query.equal('aceitaLancamento', true), Query.limit(100)]);
  const byCod = new Map(contas.documents.map(c => [c.codigo, c.$id]));
  const BANCO = byCod.get('1.1.02'), DESPESA = byCod.get('6.1');
  ok(!!BANCO && !!DESPESA, 'Contas 1.1.02 (Bancos) e 6.1 (Despesas Adm) disponíveis');

  console.log('\n── GATE: mesma conta nos dois lados deve bloquear ──');
  ok(!podeLancar({ data: '2026-06-23', historico: 'x', contaDebitoId: BANCO, contaCreditoId: BANCO, valor: 100 }),
    'Débito == Crédito → botão "Lançar" DESABILITADO');

  console.log('\n── GATE: faltando conta deve bloquear ──');
  ok(!podeLancar({ data: '2026-06-23', historico: 'x', contaDebitoId: BANCO, contaCreditoId: '', valor: 100 }),
    'Sem conta de crédito → DESABILITADO');

  console.log('\n── HAPPY PATH: simplificado grava no Appwrite ──');
  const form = { data: '2026-06-23', historico: 'TESTE SIMPLIFICADO (apagar)', tipo: 'NORMAL',
                 contaDebitoId: DESPESA, contaCreditoId: BANCO, valor: 750 }; // sem partidas!
  ok(podeLancar(form), 'Form válido + contas distintas → botão "Lançar" HABILITADO');

  const ult = await db.listDocuments(DB, 'lancamentos', [Query.equal('empresaId', EMPRESA_ID), Query.orderDesc('numero'), Query.limit(1)]);
  const numero = (ult.documents[0]?.numero ?? 0) + 1;
  const payload = buildPayload(form, numero);
  ok(payload.contaDebitoId === DESPESA && payload.contaCreditoId === BANCO && payload.valor === 750,
    `Payload montado sem partidas: D=6.1, C=1.1.02, valor=R$750, nº ${numero}`);

  const criado = await db.createDocument(DB, 'lancamentos', ID.unique(), payload);
  const lido = await db.getDocument(DB, 'lancamentos', criado.$id);
  ok(lido.valor === 750 && lido.contaDebitoId === DESPESA && lido.contaCreditoId === BANCO && lido.status === 'NORMAL',
    `Persistido e lido de volta: valor=R$${lido.valor}, status=${lido.status}`);

  await db.deleteDocument(DB, 'lancamentos', criado.$id);
  const existe = await db.getDocument(DB, 'lancamentos', criado.$id).then(() => true).catch(() => false);
  ok(!existe, 'Cleanup: lançamento de teste removido (dados intactos)');

  console.log(`\n${fail === 0 ? '🎉' : '⚠️'}  Resultado: ${pass} passou, ${fail} falhou.`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
