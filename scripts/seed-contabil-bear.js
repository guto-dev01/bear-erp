// Seed de dados contábeis para TESTE — empresa BEAR FINANCE.
// Cria o plano de contas referencial (CFC/CPC) + lançamentos de exemplo balanceados.
// Idempotente: não duplica contas (por código) nem recria lançamentos se já houver.
//
//   node scripts/seed-contabil-bear.js
//
const { Client, Databases, Query, ID } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
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

// Alvo: BEAR FINANCE (descoberto via probe). tenantId do usuário admin = default.
const EMPRESA_ID = '6a299904003b32e2895d';
const TENANT_ID = 'default';
const COMPETENCIA = '2026-06';

const nivelFromCodigo = (codigo) => (codigo ? codigo.split('.').length : 1);
const paiCodigo = (codigo) => {
  const p = codigo.split('.');
  return p.length > 1 ? p.slice(0, -1).join('.') : null;
};

// Mesmo plano referencial gerado pelo app (importPlanoReferencial).
function planoReferencial() {
  const c = (codigo, nome, classificacao, natureza, tipo) =>
    ({ codigo, nome, classificacao, natureza, tipo, aceitaLancamento: tipo === 'ANALITICA' });
  return [
    c('1', 'ATIVO', 'ATIVO', 'DEVEDORA', 'SINTETICA'),
    c('1.1', 'ATIVO CIRCULANTE', 'ATIVO', 'DEVEDORA', 'SINTETICA'),
    c('1.1.01', 'Caixa e Equivalentes', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
    c('1.1.02', 'Bancos Conta Movimento', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
    c('1.1.03', 'Clientes a Receber', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
    c('1.1.04', 'Estoques', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
    c('1.2', 'ATIVO NÃO CIRCULANTE', 'ATIVO', 'DEVEDORA', 'SINTETICA'),
    c('1.2.01', 'Imobilizado', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
    c('2', 'PASSIVO', 'PASSIVO', 'CREDORA', 'SINTETICA'),
    c('2.1', 'PASSIVO CIRCULANTE', 'PASSIVO', 'CREDORA', 'SINTETICA'),
    c('2.1.01', 'Fornecedores', 'PASSIVO', 'CREDORA', 'ANALITICA'),
    c('2.1.02', 'Obrigações Trabalhistas', 'PASSIVO', 'CREDORA', 'ANALITICA'),
    c('2.1.03', 'Obrigações Fiscais', 'PASSIVO', 'CREDORA', 'ANALITICA'),
    c('3', 'PATRIMÔNIO LÍQUIDO', 'PATRIMONIO_LIQUIDO', 'CREDORA', 'SINTETICA'),
    c('3.1', 'Capital Social', 'PATRIMONIO_LIQUIDO', 'CREDORA', 'ANALITICA'),
    c('3.2', 'Reservas de Lucros', 'PATRIMONIO_LIQUIDO', 'CREDORA', 'ANALITICA'),
    c('4', 'RECEITAS', 'RECEITA', 'CREDORA', 'SINTETICA'),
    c('4.1', 'Receita de Vendas/Serviços', 'RECEITA', 'CREDORA', 'ANALITICA'),
    c('5', 'CUSTOS', 'CUSTO', 'DEVEDORA', 'SINTETICA'),
    c('5.1', 'Custo dos Produtos/Serviços', 'CUSTO', 'DEVEDORA', 'ANALITICA'),
    c('6', 'DESPESAS', 'DESPESA', 'DEVEDORA', 'SINTETICA'),
    c('6.1', 'Despesas Administrativas', 'DESPESA', 'DEVEDORA', 'ANALITICA'),
    c('6.2', 'Despesas Comerciais', 'DESPESA', 'DEVEDORA', 'ANALITICA'),
    c('6.3', 'Despesas Financeiras', 'DESPESA', 'DEVEDORA', 'ANALITICA'),
  ];
}

// Lançamentos de exemplo (débito → crédito) usando os códigos analíticos acima.
function lancamentosExemplo() {
  return [
    { data: '2026-06-01', tipo: 'ABERTURA', historico: 'Integralização de capital social', deb: '1.1.02', cred: '3.1',     valor: 100000 },
    { data: '2026-06-03', tipo: 'NORMAL',   historico: 'Compra de mercadorias à vista',     deb: '1.1.04', cred: '1.1.02', valor: 25000 },
    { data: '2026-06-05', tipo: 'NORMAL',   historico: 'Compra de imobilizado a prazo',     deb: '1.2.01', cred: '2.1.01', valor: 30000 },
    { data: '2026-06-08', tipo: 'NORMAL',   historico: 'Venda de mercadorias a prazo',      deb: '1.1.03', cred: '4.1',    valor: 40000 },
    { data: '2026-06-08', tipo: 'NORMAL',   historico: 'Custo das mercadorias vendidas',    deb: '5.1',    cred: '1.1.04', valor: 22000 },
    { data: '2026-06-12', tipo: 'NORMAL',   historico: 'Recebimento de cliente',            deb: '1.1.01', cred: '1.1.03', valor: 15000 },
    { data: '2026-06-15', tipo: 'NORMAL',   historico: 'Pagamento de despesas administrativas', deb: '6.1', cred: '1.1.02', valor: 8000 },
    { data: '2026-06-18', tipo: 'NORMAL',   historico: 'Comissões sobre vendas',            deb: '6.2',    cred: '1.1.02', valor: 3500 },
    { data: '2026-06-20', tipo: 'NORMAL',   historico: 'Juros e tarifas bancárias',         deb: '6.3',    cred: '1.1.02', valor: 1200 },
  ];
}

(async () => {
  const now = new Date().toISOString();

  // ── 1) Plano de contas ──────────────────────────────────────────
  const existentes = [];
  let off = 0;
  while (true) {
    const page = await db.listDocuments(DB, 'plano_contas', [
      Query.equal('empresaId', EMPRESA_ID), Query.limit(100), Query.offset(off),
    ]);
    existentes.push(...page.documents);
    if (page.documents.length < 100) break;
    off += 100;
  }
  const idByCodigo = new Map(existentes.map(d => [d.codigo, d.$id]));
  console.log(`Plano BEAR FINANCE: ${existentes.length} conta(s) já existem.`);

  const plano = planoReferencial().sort((a, b) => nivelFromCodigo(a.codigo) - nivelFromCodigo(b.codigo));
  let criadas = 0;
  for (const c of plano) {
    if (idByCodigo.has(c.codigo)) continue;
    const payload = {
      codigo: c.codigo,
      nome: c.nome,
      tipo: c.tipo,
      natureza: c.natureza,
      classificacao: c.classificacao,
      nivel: nivelFromCodigo(c.codigo),
      aceitaLancamento: c.aceitaLancamento,
      ativo: true,
      tenantId: TENANT_ID,
      empresaId: EMPRESA_ID,
      createdAt: now,
    };
    const pai = paiCodigo(c.codigo);
    if (pai && idByCodigo.has(pai)) payload.contaPaiId = idByCodigo.get(pai);
    const doc = await db.createDocument(DB, 'plano_contas', ID.unique(), payload);
    idByCodigo.set(c.codigo, doc.$id);
    criadas++;
    console.log(`  + conta ${c.codigo} — ${c.nome}`);
  }
  console.log(`Plano: ${criadas} conta(s) criada(s).`);

  // ── 2) Lançamentos de exemplo ───────────────────────────────────
  const lancExist = await db.listDocuments(DB, 'lancamentos', [
    Query.equal('empresaId', EMPRESA_ID), Query.limit(1),
  ]);
  if (lancExist.total > 0) {
    console.log(`Lançamentos: já existem ${lancExist.total} — pulando para não duplicar.`);
    console.log('\n✅ Seed concluído.');
    return;
  }

  const lancs = lancamentosExemplo();
  let numero = 1;
  for (const l of lancs) {
    const debId = idByCodigo.get(l.deb), credId = idByCodigo.get(l.cred);
    if (!debId || !credId) { console.log(`  ! pulado (conta ausente): ${l.historico}`); continue; }
    await db.createDocument(DB, 'lancamentos', ID.unique(), {
      numero: numero++,
      data: l.data,
      tipo: l.tipo,
      historico: l.historico,
      valor: l.valor,
      contaDebitoId: debId,
      contaCreditoId: credId,
      contaDebitoCodigo: l.deb,
      contaCreditoCodigo: l.cred,
      competencia: COMPETENCIA,
      status: 'NORMAL',
      tenantId: TENANT_ID,
      empresaId: EMPRESA_ID,
      createdAt: now,
    });
    console.log(`  + lanç #${numero - 1} ${l.deb}→${l.cred} R$${l.valor.toLocaleString('pt-BR')} — ${l.historico}`);
  }
  console.log(`Lançamentos: ${numero - 1} criado(s).`);
  console.log('\n✅ Seed concluído.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
