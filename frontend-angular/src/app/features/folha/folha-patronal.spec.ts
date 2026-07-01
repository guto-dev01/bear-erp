import { calcularInssPatronal, ratEfetivo, calcularEncargosPatronais } from './folha-patronal';
import { calcularInss, FaixaInss } from './folha-calc';

// Tabela INSS do empregado, com teto do segurado no topo (8.157,41).
const FAIXAS_INSS: FaixaInss[] = [
  { $id: '1', vigencia: '2026', faixa: 1, salarioMinimo: 0,       salarioMaximo: 1518.00, aliquota: 7.5 },
  { $id: '2', vigencia: '2026', faixa: 2, salarioMinimo: 1518.01, salarioMaximo: 2793.88, aliquota: 9 },
  { $id: '3', vigencia: '2026', faixa: 3, salarioMinimo: 2793.89, salarioMaximo: 4190.83, aliquota: 12 },
  { $id: '4', vigencia: '2026', faixa: 4, salarioMinimo: 4190.84, salarioMaximo: 8157.41, aliquota: 14 },
];

describe('INSS patronal — 20% SEM teto (≠ INSS do empregado)', () => {
  it('salário acima do teto: patronal incide sobre o TOTAL, empregado é capado', () => {
    // R$10.000 > teto do segurado R$8.157,41
    expect(calcularInssPatronal(10000)).toBe(2000);              // 20% de 10.000 (sem teto)
    expect(calcularInss(10000, FAIXAS_INSS)).toBeCloseTo(951.63, 2); // empregado: capado no teto
    // prova: 2000 ≠ 951,63 (empregado) e ≠ 1.631,48 (20% do teto) → patronal sem teto
    expect(calcularInssPatronal(10000)).not.toBe(round2(8157.41 * 0.20));
  });
});

describe('RAT efetivo = RAT × FAP', () => {
  it('RAT 2% × FAP 1,5 = 3%', () => {
    expect(ratEfetivo(2, 1.5)).toBe(3);
    expect(calcularEncargosPatronais(10000, { rat: 2, fap: 1.5, aliqTerceiros: 0 }).valorRat).toBe(300);
  });
  it('FAP mínimo (0,5) reduz o RAT pela metade', () => {
    expect(ratEfetivo(2, 0.5)).toBe(1);
  });
});

describe('total de encargos patronais — holerite simples (base 5.000)', () => {
  it('INSS 20% + RAT×FAP + terceiros', () => {
    const e = calcularEncargosPatronais(5000, { rat: 2, fap: 1.0, aliqTerceiros: 5.8 });
    expect(e.inssPatronal).toBe(1000);   // 20%
    expect(e.ratEfetivo).toBe(2);        // 2% × 1,0
    expect(e.valorRat).toBe(100);
    expect(e.terceiros).toBe(290);       // 5,8%
    expect(e.total).toBe(1390);
  });
  it('Simples sem patronal própria (recolhePatronal=false) → zero', () => {
    expect(calcularEncargosPatronais(5000, { rat: 2, fap: 1, aliqTerceiros: 5.8, recolhePatronal: false }).total).toBe(0);
  });
});

function round2(v: number): number { return Math.round((v + Number.EPSILON) * 100) / 100; }
