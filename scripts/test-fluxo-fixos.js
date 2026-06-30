// Testa o fluxo de Lançamentos Fixos replicando a lógica real do service:
// createFixo → gerarFixos(ano,mes) → idempotência → cleanup completo.
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
const DB = process.env.APPWRITE_DB_ID, EMPRESA = '6a299904003b32e2895d', TENANT = 'default';
let pass = 0, fail = 0;
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); c ? pass++ : fail++; };

// Réplica de service.gerarFixos(ano, mes)
async function gerarFixos(ano, mes) {
  const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const fixosR = await db.listDocuments(DB, 'lancamentos_fixos', [Query.equal('empresaId', EMPRESA), Query.limit(100)]);
  const lancsR = await db.listDocuments(DB, 'lancamentos', [Query.equal('empresaId', EMPRESA), Query.limit(100)]);
  const ultR = await db.listDocuments(DB, 'lancamentos', [Query.equal('empresaId', EMPRESA), Query.orderDesc('numero'), Query.limit(1)]);
  let n = (ultR.documents[0]?.numero ?? 0) + 1;
  const jaGerados = new Set(lancsR.documents.map(l => l.documentoRef).filter(Boolean));
  const vigente = (f) => (!f.vigenciaInicio || competencia >= f.vigenciaInicio) && (!f.vigenciaFim || competencia <= f.vigenciaFim);
  const vigentes = fixosR.documents.filter(f => (f.ativo ?? true) && vigente(f));
  const aCriar = vigentes.filter(f => !jaGerados.has(`FIXO:${f.$id}:${competencia}`));
  const criados = [];
  for (const f of aCriar) {
    const dia = Math.min(Math.max(f.diaVencimento || 1, 1), diasNoMes);
    const doc = await db.createDocument(DB, 'lancamentos', ID.unique(), {
      numero: n++, data: `${competencia}-${String(dia).padStart(2, '0')}`, tipo: f.tipo || 'NORMAL',
      historico: f.historico, valor: f.valor, contaDebitoId: f.contaDebitoId, contaCreditoId: f.contaCreditoId,
      contaDebitoCodigo: f.contaDebitoCodigo, contaCreditoCodigo: f.contaCreditoCodigo,
      competencia, status: 'NORMAL', documentoRef: `FIXO:${f.$id}:${competencia}`, tenantId: TENANT, empresaId: EMPRESA,
    });
    criados.push(doc);
  }
  return { criados, pulados: vigentes.length - aCriar.length, total: vigentes.length };
}

(async () => {
  const contas = await db.listDocuments(DB, 'plano_contas', [Query.equal('empresaId', EMPRESA), Query.equal('aceitaLancamento', true), Query.limit(100)]);
  const byCod = new Map(contas.documents.map(c => [c.codigo, c.$id]));
  const DESP = byCod.get('6.3'), BANCO = byCod.get('1.1.02');

  console.log('── Cadastro de fixo ──');
  const fixo = await db.createDocument(DB, 'lancamentos_fixos', ID.unique(), {
    historico: 'TESTE FIXO — aluguel (apagar)', contaDebitoId: DESP, contaCreditoId: BANCO,
    contaDebitoCodigo: '6.3', contaCreditoCodigo: '1.1.02', valor: 990, diaVencimento: 5,
    tipo: 'NORMAL', ativo: true, vigenciaInicio: '', vigenciaFim: '', tenantId: TENANT, empresaId: EMPRESA,
  });
  ok(!!fixo.$id, `Fixo criado em lancamentos_fixos ($id=${fixo.$id})`);

  console.log('\n── 1ª geração (competência 2026-09) ──');
  const g1 = await gerarFixos(2026, 9);
  ok(g1.criados.length === 1 && g1.pulados === 0, `Gerou 1 lançamento (pulados=${g1.pulados})`);
  const gerado = g1.criados[0];
  ok(gerado && gerado.data === '2026-09-05' && gerado.valor === 990 && gerado.documentoRef === `FIXO:${fixo.$id}:2026-09`,
    `Lançamento correto: data=${gerado?.data}, valor=R$${gerado?.valor}, ref=${gerado?.documentoRef}`);

  console.log('\n── 2ª geração (idempotência) ──');
  const g2 = await gerarFixos(2026, 9);
  ok(g2.criados.length === 0 && g2.pulados === 1, `Não duplicou: criados=${g2.criados.length}, pulados=${g2.pulados}`);

  console.log('\n── Fixo inativo não gera ──');
  await db.updateDocument(DB, 'lancamentos_fixos', fixo.$id, { ativo: false });
  const g3 = await gerarFixos(2026, 10);
  ok(g3.total === 0, `Competência 2026-10 com fixo inativo → nenhum vigente (total=${g3.total})`);

  console.log('\n── Cleanup ──');
  await db.deleteDocument(DB, 'lancamentos', gerado.$id);
  await db.deleteDocument(DB, 'lancamentos_fixos', fixo.$id);
  const lExiste = await db.getDocument(DB, 'lancamentos', gerado.$id).then(() => true).catch(() => false);
  const fExiste = await db.getDocument(DB, 'lancamentos_fixos', fixo.$id).then(() => true).catch(() => false);
  ok(!lExiste && !fExiste, 'Lançamento gerado e fixo de teste removidos (dados intactos)');

  console.log(`\n${fail === 0 ? '🎉' : '⚠️'}  Resultado: ${pass} passou, ${fail} falhou.`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
