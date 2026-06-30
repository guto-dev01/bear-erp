/**
 * Teste da apuração federal (Fase 4) — roda SEM Appwrite e SEM navegador.
 * Exercita PIS/COFINS (cumulativo/não-cum), IRPJ/CSLL Presumido e Simples (DAS).
 *
 *   node scripts/test-apuracao-federal.ts
 */
import {
  apurarPisCofins,
  apurarIrpjCsllPresumido,
  calcularDasSimples,
} from '../frontend-angular/src/app/features/fiscal/engine/apuracao-federal.ts';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  cond ? pass++ : fail++;
};
const eq = (a: number, b: number, msg: string) => ok(Math.abs(a - b) < 0.01, `${msg} (esperado ${b}, obtido ${a})`);

const saida = (o: Record<string, unknown> = {}) => ({ tipoOperacao: 'SAIDA', status: 'AUTORIZADA', ...o });
const entrada = (o: Record<string, unknown> = {}) => ({ tipoOperacao: 'ENTRADA', status: 'AUTORIZADA', ...o });

// ════════ PIS/COFINS ════════
// C1: Cumulativo (Presumido) — entradas NÃO geram crédito
{
  const r = apurarPisCofins(
    [saida({ valorTotal: 10000, valorPIS: 65, valorCOFINS: 300 }), entrada({ valorPIS: 999, valorCOFINS: 999 })],
    {}, { regime: 'PRESUMIDO' },
  );
  ok(r.regime === 'CUMULATIVO', 'C1 Presumido ⇒ cumulativo');
  eq(r.pis.debitos, 65, 'C1 PIS débito = destacado saídas');
  eq(r.pis.creditos, 0, 'C1 PIS sem crédito no cumulativo');
  eq(r.cofins.creditos, 0, 'C1 COFINS sem crédito no cumulativo');
  eq(r.pis.valorRecolher, 65, 'C1 PIS a recolher = débito');
  eq(r.cofins.valorRecolher, 300, 'C1 COFINS a recolher = débito');
}

// C2: Não-cumulativo (Real) — entradas geram crédito real (substitui creditos=0)
{
  const r = apurarPisCofins(
    [saida({ valorTotal: 10000, valorPIS: 165, valorCOFINS: 760 }), entrada({ valorPIS: 100, valorCOFINS: 460 })],
    {}, { regime: 'REAL' },
  );
  ok(r.regime === 'NAO_CUMULATIVO', 'C2 Real ⇒ não-cumulativo');
  eq(r.pis.creditos, 100, 'C2 PIS crédito de entradas');
  eq(r.cofins.creditos, 460, 'C2 COFINS crédito de entradas');
  eq(r.pis.valorRecolher, 65, 'C2 PIS a recolher = 165 − 100');
  eq(r.cofins.valorRecolher, 300, 'C2 COFINS a recolher = 760 − 460');
}

// C3: crédito > débito ⇒ saldo credor transportado
{
  const r = apurarPisCofins(
    [saida({ valorPIS: 50 }), entrada({ valorPIS: 200 })],
    {}, { regime: 'REAL' },
  );
  eq(r.pis.valorRecolher, 0, 'C3 nada a recolher');
  eq(r.pis.saldoCredorTransportar, 150, 'C3 saldo credor PIS = 200 − 50');
}

// C4: saldo credor anterior + retido reduzem o recolhimento
{
  const r = apurarPisCofins(
    [saida({ valorPIS: 300 }), entrada({ valorPIS: 50 })],
    { pis: 40 }, { regime: 'REAL', retidoPis: 10 },
  );
  eq(r.pis.saldoCredorAnterior, 40, 'C4 saldo credor anterior aplicado');
  eq(r.pis.retido, 10, 'C4 retido na fonte aplicado');
  eq(r.pis.valorRecolher, 200, 'C4 a recolher = 300 − 50 − 10 − 40');
}

// C5: estimativa pela alíquota quando não há valor destacado
{
  const r = apurarPisCofins([saida({ valorTotal: 100000 })], {}, { regime: 'PRESUMIDO' });
  eq(r.pis.debitos, 650, 'C5 PIS estimado = 0,65% de 100.000');
  eq(r.cofins.debitos, 3000, 'C5 COFINS estimado = 3% de 100.000');
}

// C6: Simples não apura (DAS)
{
  const r = apurarPisCofins([saida({ valorTotal: 50000, valorPIS: 100 })], { pis: 10 }, { regime: 'SIMPLES' });
  ok(r.semApuracao, 'C6 Simples marca semApuracao');
  eq(r.pis.valorRecolher, 0, 'C6 PIS zerado no Simples');
  eq(r.cofins.valorRecolher, 0, 'C6 COFINS zerado no Simples');
}

// ════════ IRPJ/CSLL (Lucro Presumido) ════════
// C7: Comércio, sem adicional
{
  const r = apurarIrpjCsllPresumido(100000, { atividade: 'COMERCIO' });
  eq(r.baseIrpj, 8000, 'C7 base IRPJ = 8% de 100.000');
  eq(r.irpj, 1200, 'C7 IRPJ = 15% de 8.000');
  eq(r.adicionalIrpj, 0, 'C7 sem adicional (base < 60.000)');
  eq(r.baseCsll, 12000, 'C7 base CSLL = 12%');
  eq(r.csll, 1080, 'C7 CSLL = 9% de 12.000');
}

// C8: Comércio, com adicional de 10%
{
  const r = apurarIrpjCsllPresumido(1000000, { atividade: 'COMERCIO' });
  eq(r.baseIrpj, 80000, 'C8 base IRPJ = 8% de 1.000.000');
  eq(r.irpj, 12000, 'C8 IRPJ = 15% de 80.000');
  eq(r.adicionalIrpj, 2000, 'C8 adicional = 10% × (80.000 − 60.000)');
  eq(r.irpjTotal, 14000, 'C8 IRPJ total = 12.000 + 2.000');
}

// C9: Serviços (presunção 32%)
{
  const r = apurarIrpjCsllPresumido(100000, { atividade: 'SERVICOS' });
  eq(r.baseIrpj, 32000, 'C9 base IRPJ serviços = 32%');
  eq(r.irpj, 4800, 'C9 IRPJ serviços = 15% de 32.000');
  eq(r.csll, 2880, 'C9 CSLL serviços = 9% de 32.000');
}

// ════════ Simples Nacional (DAS) ════════
// C10: Anexo I, faixa 1 (efetiva = nominal, PD = 0)
{
  const r = calcularDasSimples(120000, 10000, { anexo: 'I' });
  ok(r.faixa === 1, 'C10 faixa 1');
  eq(r.aliquotaEfetiva, 4.0, 'C10 efetiva = nominal na faixa 1');
  eq(r.valorDas, 400, 'C10 DAS = 4% de 10.000');
}

// C11: Anexo I, faixa 2 (alíquota efetiva com dedução)
{
  const r = calcularDasSimples(300000, 25000, { anexo: 'I' });
  ok(r.faixa === 2, 'C11 faixa 2');
  eq(r.aliquotaEfetiva, 5.32, 'C11 efetiva = (300k×7,3% − 5.940)/300k');
  eq(r.valorDas, 1330, 'C11 DAS = 5,32% de 25.000');
}

// C12: RBT12 acima do teto ⇒ fora do Simples
{
  const r = calcularDasSimples(5000000, 100000, { anexo: 'III' });
  ok(r.foraDoSimples, 'C12 RBT12 > 4,8 mi ⇒ fora do Simples');
  ok(r.faixa === 6, 'C12 enquadrado na última faixa');
}

// C13: primeira competência (RBT12 = 0) usa a receita do mês como base
{
  const r = calcularDasSimples(0, 10000, { anexo: 'I' });
  eq(r.aliquotaEfetiva, 4.0, 'C13 base = receita do mês ⇒ faixa 1');
  eq(r.valorDas, 400, 'C13 DAS = 4% de 10.000');
}

console.log(`\n${pass} asserções passaram, ${fail} falharam.`);
if (fail > 0) process.exit(1);
