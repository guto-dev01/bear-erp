/**
 * Teste do motor de apuração fiscal (Fase 3) — roda SEM Appwrite e SEM navegador.
 * Exercita a engine pura `apurarPeriodo` (ICMS/IPI, saldo credor, ST/DIFAL/Simples).
 *
 *   node scripts/test-apuracao-fiscal.ts
 *
 * Requer Node ≥ 22.6 (type-stripping nativo). A engine é pura (sem imports de
 * runtime), por isso pode ser carregada diretamente.
 */
import {
  apurarPeriodo,
  isEntrada,
  isSaida,
  type NotaApuravel,
} from '../frontend-angular/src/app/features/fiscal/engine/apuracao-fiscal.ts';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  cond ? pass++ : fail++;
};
const eq = (a: number, b: number, msg: string) => ok(Math.abs(a - b) < 0.005, `${msg} (esperado ${b}, obtido ${a})`);

const saida = (over: Partial<NotaApuravel> = {}): NotaApuravel => ({ tipoOperacao: 'SAIDA', status: 'AUTORIZADA', ...over });
const entrada = (over: Partial<NotaApuravel> = {}): NotaApuravel => ({ tipoOperacao: 'ENTRADA', status: 'AUTORIZADA', ...over });

// ── Classificação entrada/saída ─────────────────────────────
ok(isEntrada({ tipoOperacao: 'ENTRADA' }), 'ENTRADA é entrada');
ok(isEntrada({ tipoOperacao: 'entrada' }), 'classificação case-insensitive');
ok(isSaida({ tipoOperacao: 'SAIDA' }), 'SAIDA é saída');
ok(isSaida({ tipo: 'NFE' }), 'nota legada (sem tipoOperacao) conta como saída');

// ── Cenário 1: só saídas (comportamento legado) ─────────────
{
  const r = apurarPeriodo([
    saida({ valorICMS: 100, valorTotal: 1000 }),
    saida({ valorICMS: 50, valorTotal: 500 }),
  ]);
  eq(r.icms.debitos, 150, 'C1 débitos = soma ICMS saídas');
  eq(r.icms.creditos, 0, 'C1 créditos = 0 (sem entradas)');
  eq(r.icms.valorRecolher, 150, 'C1 ICMS a recolher = débitos');
  eq(r.icms.saldoCredorTransportar, 0, 'C1 sem saldo credor');
  eq(r.baseCalculoSaidas, 1500, 'C1 base = total das saídas');
}

// ── Cenário 2: entradas geram crédito real (substitui creditos=0) ──
{
  const r = apurarPeriodo([
    saida({ valorICMS: 180, valorTotal: 1000 }),
    entrada({ valorICMS: 120, valorTotal: 700 }),
  ]);
  eq(r.icms.debitos, 180, 'C2 débitos = ICMS saídas');
  eq(r.icms.creditos, 120, 'C2 créditos = ICMS entradas');
  eq(r.icms.valorRecolher, 60, 'C2 ICMS a recolher = 180 − 120');
  eq(r.icms.saldoCredorTransportar, 0, 'C2 sem saldo credor');
  eq(r.baseCalculoSaidas, 1000, 'C2 base só considera saídas');
}

// ── Cenário 3: créditos > débitos ⇒ saldo credor a transportar ──
{
  const r = apurarPeriodo([
    saida({ valorICMS: 80 }),
    entrada({ valorICMS: 200 }),
  ]);
  eq(r.icms.valorRecolher, 0, 'C3 nada a recolher');
  eq(r.icms.saldoCredorTransportar, 120, 'C3 saldo credor = 200 − 80');
  eq(r.icms.saldoApurado, -120, 'C3 saldo apurado negativo');
}

// ── Cenário 4: saldo credor anterior abate o débito ─────────
{
  const r = apurarPeriodo([saida({ valorICMS: 300 }), entrada({ valorICMS: 100 })], { icms: 50 });
  eq(r.icms.saldoCredorAnterior, 50, 'C4 saldo credor anterior aplicado');
  eq(r.icms.valorRecolher, 150, 'C4 a recolher = 300 − 100 − 50');
  // saldo anterior maior que o saldo devedor ⇒ transporta a diferença
  const r2 = apurarPeriodo([saida({ valorICMS: 100 }), entrada({ valorICMS: 100 })], { icms: 70 });
  eq(r2.icms.valorRecolher, 0, 'C4b nada a recolher quando saldo anterior cobre');
  eq(r2.icms.saldoCredorTransportar, 70, 'C4b saldo anterior transporta integralmente');
}

// ── Cenário 5: IPI apura em paralelo ao ICMS ────────────────
{
  const r = apurarPeriodo([
    saida({ valorICMS: 100, valorIPI: 40 }),
    entrada({ valorICMS: 30, valorIPI: 15 }),
  ], { icms: 0, ipi: 5 });
  eq(r.ipi.debitos, 40, 'C5 IPI débitos');
  eq(r.ipi.creditos, 15, 'C5 IPI créditos');
  eq(r.ipi.valorRecolher, 20, 'C5 IPI a recolher = 40 − 15 − 5');
  eq(r.icms.valorRecolher, 70, 'C5 ICMS independente do IPI');
}

// ── Cenário 6: ST / DIFAL / FCP das saídas, recolhidos à parte ──
{
  const r = apurarPeriodo([
    saida({ valorICMS: 100, valorICMSST: 35, valorDifal: 18, valorFCP: 7 }),
    entrada({ valorICMS: 40, valorICMSST: 99 }), // ST de entrada NÃO entra na conta
  ]);
  eq(r.icmsStRecolher, 35, 'C6 ICMS-ST só das saídas');
  eq(r.difalRecolher, 18, 'C6 DIFAL das saídas');
  eq(r.fcpRecolher, 7, 'C6 FCP das saídas');
  eq(r.icms.valorRecolher, 60, 'C6 ICMS próprio = 100 − 40 (ST não afeta)');
}

// ── Cenário 7: Simples Nacional não apura por confronto ─────
{
  const r = apurarPeriodo([
    saida({ valorICMS: 100, valorIPI: 50, valorTotal: 2000 }),
    entrada({ valorICMS: 30 }),
  ], { icms: 10 }, { regime: 'SIMPLES' });
  ok(r.semApuracaoNormal, 'C7 marca regime sem apuração normal');
  eq(r.icms.valorRecolher, 0, 'C7 ICMS zerado no Simples');
  eq(r.ipi.valorRecolher, 0, 'C7 IPI zerado no Simples');
  eq(r.icms.creditos, 0, 'C7 sem créditos no Simples');
  eq(r.baseCalculoSaidas, 2000, 'C7 base de saídas ainda é informada');
}

// ── Cenário 8: arredondamento a 2 casas ─────────────────────
{
  const r = apurarPeriodo([
    saida({ valorICMS: 10.005 }),
    saida({ valorICMS: 10.005 }),
    entrada({ valorICMS: 3.334 }),
  ]);
  eq(r.icms.debitos, 20.01, 'C8 débitos arredondados');
  eq(r.icms.creditos, 3.33, 'C8 créditos arredondados');
  eq(r.icms.valorRecolher, 16.68, 'C8 recolher arredondado');
}

console.log(`\n${pass} asserções passaram, ${fail} falharam.`);
if (fail > 0) process.exit(1);
