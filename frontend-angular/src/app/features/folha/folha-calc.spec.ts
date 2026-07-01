import {
  calcularInss, calcularIrrf, calcularIrrfDividendos, calcularFgts,
  FaixaInss, FaixaIrrf,
} from './folha-calc';

// Tabela progressiva mensal vigente em 2026 (Lei 15.270/2025 NÃO altera a tabela;
// só acrescenta o redutor). Dedução por dependente 189,59; simplificado 607,20.
const FAIXAS_IRRF_2026: FaixaIrrf[] = [
  { $id: '1', vigencia: '2026', faixa: 1, baseMinima: 0,       baseMaxima: 2428.80,  aliquota: 0,    deducao: 0,      deducaoPorDependente: 189.59 },
  { $id: '2', vigencia: '2026', faixa: 2, baseMinima: 2428.81, baseMaxima: 2826.65,  aliquota: 7.5,  deducao: 182.16 },
  { $id: '3', vigencia: '2026', faixa: 3, baseMinima: 2826.66, baseMaxima: 3751.05,  aliquota: 15,   deducao: 394.16 },
  { $id: '4', vigencia: '2026', faixa: 4, baseMinima: 3751.06, baseMaxima: 4664.68,  aliquota: 22.5, deducao: 675.49 },
  { $id: '5', vigencia: '2026', faixa: 5, baseMinima: 4664.69, baseMaxima: Infinity, aliquota: 27.5, deducao: 908.73 },
];

// Tabela INSS progressiva (faixas 2025/2026) para a guarda de regressão.
const FAIXAS_INSS: FaixaInss[] = [
  { $id: '1', vigencia: '2026', faixa: 1, salarioMinimo: 0,       salarioMaximo: 1518.00, aliquota: 7.5 },
  { $id: '2', vigencia: '2026', faixa: 2, salarioMinimo: 1518.01, salarioMaximo: 2793.88, aliquota: 9 },
  { $id: '3', vigencia: '2026', faixa: 3, salarioMinimo: 2793.89, salarioMaximo: 4190.83, aliquota: 12 },
  { $id: '4', vigencia: '2026', faixa: 4, salarioMinimo: 4190.84, salarioMaximo: 8157.41, aliquota: 14 },
];

describe('calcularIrrf — reforma 2026 (redutor)', () => {
  it('R$5.000: redutor zera o imposto apurado → IRRF 0 (costura isenção × faixa)', () => {
    const r = calcularIrrf(5000, 0, 0, FAIXAS_IRRF_2026);
    expect(r.valor).toBe(0);
  });

  it('R$6.000: redutor oficial = R$179,75 e IRRF final = R$394,54', () => {
    const r = calcularIrrf(6000, 0, 0, FAIXAS_IRRF_2026);
    expect(r.redutor).toBe(179.75);   // 978,62 − 0,133145 × 6000 (exemplo oficial RFB)
    expect(r.valor).toBe(394.54);     // apurado 574,29 − redutor 179,75
  });

  it('faixa de transição: reformado < pré-reforma e > 0', () => {
    const reformado = calcularIrrf(6000, 0, 0, FAIXAS_IRRF_2026);
    const cheio = calcularIrrf(6000, 0, 0, FAIXAS_IRRF_2026, { aplicarRedutor2026: false });
    expect(reformado.valor).toBeGreaterThan(0);
    expect(reformado.valor).toBeLessThan(cheio.valor);
  });

  it('acima de R$7.350,01: redutor = 0 (imposto = tabela normal)', () => {
    const r = calcularIrrf(8000, 0, 0, FAIXAS_IRRF_2026);
    const cheio = calcularIrrf(8000, 0, 0, FAIXAS_IRRF_2026, { aplicarRedutor2026: false });
    expect(r.redutor).toBe(0);
    expect(r.valor).toBe(cheio.valor);
  });

  it('redutor nunca gera imposto negativo (cap no apurado)', () => {
    const r = calcularIrrf(5000, 0, 0, FAIXAS_IRRF_2026);
    expect(r.valor).toBeGreaterThanOrEqual(0);
    expect(r.redutor).toBeLessThanOrEqual(312.89 + 1e-9); // = apurado em R$5.000
  });

  it('reuso no 13º: passar o rendimento do 13º como R produz o mesmo redutor', () => {
    const decimoTerceiro = calcularIrrf(6000, 0, 0, FAIXAS_IRRF_2026);
    expect(decimoTerceiro.redutor).toBe(179.75);
  });

  it('desconto simplificado é aplicado quando supera as deduções legais', () => {
    // INSS baixo (100) < simplificado (607,20) → base usa o simplificado
    const r = calcularIrrf(3500, 100, 0, FAIXAS_IRRF_2026, { aplicarRedutor2026: false });
    expect(r.base).toBe(2892.80); // 3500 − 607,20
  });
});

describe('calcularIrrfDividendos — 10% sobre o total (art. 6º-A)', () => {
  it('R$40k (≤ 50k) → isento', () => {
    expect(calcularIrrfDividendos(40000)).toBe(0);
  });
  it('exatamente R$50k → isento (gatilho é "superior a")', () => {
    expect(calcularIrrfDividendos(50000)).toBe(0);
  });
  it('R$60k → R$6.000 (10% sobre o TOTAL, não sobre o excedente)', () => {
    expect(calcularIrrfDividendos(60000)).toBe(6000);
  });
  it('fonte Simples com reterSimples=false → não retém (tema judicializado)', () => {
    expect(calcularIrrfDividendos(60000, { fonteSimples: true, reterSimples: false })).toBe(0);
  });
  it('fonte Simples com default (reter) → retém (entendimento RFB)', () => {
    expect(calcularIrrfDividendos(60000, { fonteSimples: true })).toBe(6000);
  });
});

describe('calcularInss — guarda de regressão (motor existente)', () => {
  it('progressivo por faixas: salário R$2.000 → INSS R$157,23', () => {
    expect(calcularInss(2000, FAIXAS_INSS)).toBe(157.23);
  });
  it('salário 0 → 0', () => {
    expect(calcularInss(0, FAIXAS_INSS)).toBe(0);
  });
});

describe('calcularFgts — guarda de regressão', () => {
  it('8% da base', () => {
    expect(calcularFgts(3000)).toBe(240);
  });
});
