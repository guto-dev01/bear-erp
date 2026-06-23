/**
 * Teste de guias + obrigações (Fase 7) — roda SEM Appwrite e SEM navegador.
 * Valida DV módulo 10, código de barras/linha digitável (round-trip), acréscimos
 * de mora e o calendário de obrigações por regime.
 *
 *   node scripts/test-guias.ts
 */
import {
  dvModulo10,
  gerarCodigoBarras,
  linhaDigitavel,
  calcularAcrescimos,
  montarGuia,
  diasEntre,
} from '../frontend-angular/src/app/features/fiscal/engine/guias.ts';
import { calendarioObrigacoes } from '../frontend-angular/src/app/features/fiscal/engine/obrigacoes.ts';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  cond ? pass++ : fail++;
};
const eq = (a: unknown, b: unknown, msg: string) => ok(a === b, `${msg} (esperado ${JSON.stringify(b)}, obtido ${JSON.stringify(a)})`);
const near = (a: number, b: number, msg: string) => ok(Math.abs(a - b) < 0.01, `${msg} (esperado ${b}, obtido ${a})`);

// ════════ DV módulo 10 (hardcoded, à mão) ════════
eq(dvModulo10('1234'), 4, 'DV10: 1234 → 4');
eq(dvModulo10('9'), 1, 'DV10: 9 → 1 (produto 18 ⇒ 1+8=9)');
eq(dvModulo10('89'), 3, 'DV10: 89 → 3');

// ════════ Código de barras + linha digitável ════════
const cb = gerarCodigoBarras({ segmento: '7', valor: 1234.56, identificacao: '20260512345', idValor: '6' });
eq(cb.length, 44, 'Barras: 44 dígitos');
eq(cb[0], '8', 'Barras: produto = 8 (arrecadação)');
eq(cb[1], '7', 'Barras: segmento na posição 2');
eq(cb[2], '6', 'Barras: idValor na posição 3');
eq(cb.slice(4, 15), '00000123456', 'Barras: valor em centavos (11 díg) nas posições 5-15');
// DV geral consistente: reconstruir os 43 dígitos (sem a 4ª posição) e recalcular
const semDv = cb.slice(0, 3) + cb.slice(4);
eq(dvModulo10(semDv), Number(cb[3]), 'Barras: DV geral (módulo 10) consistente');

const linha = linhaDigitavel(cb);
eq(linha.length, 48, 'Linha digitável: 48 dígitos');
// Round-trip: removendo o DV de cada bloco de 12, reconstrói os 44 do código de barras
let reconstruido = '';
let dvOk = true;
for (let i = 0; i < 4; i++) {
  const campo = linha.slice(i * 12, i * 12 + 12);
  const bloco = campo.slice(0, 11);
  if (dvModulo10(bloco) !== Number(campo[11])) dvOk = false;
  reconstruido += bloco;
}
ok(dvOk, 'Linha digitável: DV de cada um dos 4 blocos confere');
eq(reconstruido, cb, 'Linha digitável: blocos sem DV reconstroem o código de barras');

// ════════ Acréscimos de mora ════════
eq(diasEntre('2026-06-20', '2026-06-30'), 10, 'Dias: 20→30 jun = 10');
{
  const a = calcularAcrescimos(1000, '2026-06-20', '2026-06-15'); // pago antes do vencimento
  eq(a.diasAtraso, 0, 'Acréscimos: sem atraso ⇒ 0 dias');
  near(a.valorTotal, 1000, 'Acréscimos: sem atraso ⇒ total = principal');
}
{
  const a = calcularAcrescimos(1000, '2026-06-20', '2026-06-30'); // 10 dias
  near(a.multaPercentual, 3.3, 'Acréscimos: multa 0,33%/dia × 10 = 3,3%');
  near(a.multa, 33, 'Acréscimos: multa = 33,00');
  near(a.juros, 10, 'Acréscimos: juros 1% a.m. (1 mês) = 10');
  near(a.valorTotal, 1043, 'Acréscimos: total = 1000 + 33 + 10');
}
{
  const a = calcularAcrescimos(1000, '2026-01-01', '2026-03-03'); // 61 dias ⇒ multa no teto
  eq(a.diasAtraso, 61, 'Acréscimos: 61 dias de atraso');
  near(a.multaPercentual, 20, 'Acréscimos: multa limitada a 20%');
  near(a.multa, 200, 'Acréscimos: multa teto = 200');
}
{
  const a = calcularAcrescimos(1000, '2026-06-20', '2026-07-20', { selicAcumulada: 2.5 });
  near(a.juros, 25, 'Acréscimos: juros pela SELIC acumulada informada (2,5%)');
}

// ════════ Montagem da guia ════════
{
  const g = montarGuia({ tipo: 'DARF', competencia: '2026-05', valorPrincipal: 500, vencimento: '2026-06-20', pagamento: '2026-06-30' });
  eq(g.codigoBarras.length, 44, 'Guia: código de barras de 44 díg');
  eq(g.linhaDigitavel.length, 48, 'Guia: linha digitável de 48 díg');
  near(g.valorTotal, 500 + 16.5 + 5, 'Guia: total = principal + multa(3,3%) + juros(1%)');
  ok(g.linhaDigitavelFormatada.split(' ').length === 4, 'Guia: linha formatada em 4 campos');
}

// ════════ Calendário de obrigações ════════
{
  const simples = calendarioObrigacoes(2026, 5, { regime: 'SIMPLES' });
  eq(simples.length, 2, 'Obrigações SIMPLES: 2 (DAS + DeSTDA)');
  eq(simples[0].tipo, 'DAS', 'Obrigações SIMPLES: DAS primeiro');
  eq(simples.find(o => o.tipo === 'DAS')!.dataVencimento, '2026-06-20', 'Obrigações: DAS vence dia 20 do mês seguinte');
  eq(simples.find(o => o.tipo === 'DESTDA')!.dataVencimento, '2026-06-28', 'Obrigações: DeSTDA vence dia 28');
}
{
  const real = calendarioObrigacoes(2026, 5, { regime: 'REAL' });
  eq(real.length, 5, 'Obrigações REAL (maio): 5 (sem IRPJ/CSLL trimestral)');
  eq(real.find(o => o.tipo === 'DCTFWEB')!.dataVencimento, '2026-06-15', 'Obrigações: DCTFWeb dia 15 do mês seguinte');
  eq(real.find(o => o.tipo === 'EFD_CONTRIBUICOES')!.dataVencimento, '2026-07-14', 'Obrigações: EFD-Contribuições 2 meses adiante');
  ok(!real.some(o => o.tipo === 'IRPJ_CSLL'), 'Obrigações: maio não é fechamento de trimestre');
}
{
  const realTrim = calendarioObrigacoes(2026, 6, { regime: 'REAL' }); // junho fecha trimestre
  ok(realTrim.some(o => o.tipo === 'IRPJ_CSLL'), 'Obrigações: junho (fim de trimestre) inclui IRPJ/CSLL');
  eq(realTrim.find(o => o.tipo === 'IRPJ_CSLL')!.dataVencimento, '2026-07-30', 'Obrigações: DARF IRPJ/CSLL vence no mês seguinte ao trimestre');
}

console.log(`\n${pass} asserções passaram, ${fail} falharam.`);
if (fail > 0) process.exit(1);
