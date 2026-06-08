// Funções puras de cálculo da folha (INSS/IRRF/FGTS) reimplementadas no cliente.
// As faixas são lidas das coleções Appwrite `tabela_inss` e `tabela_irrf`.

export interface FaixaInss {
  $id: string;
  vigencia: string;
  faixa: number;
  salarioMinimo: number;
  salarioMaximo: number;
  aliquota: number;   // em % (ex.: 7.5)
  deducao?: number;
  tenantId?: string;
}

export interface FaixaIrrf {
  $id: string;
  vigencia: string;
  faixa: number;
  baseMinima: number;
  baseMaxima: number;
  aliquota: number;   // em % (ex.: 7.5)
  deducao: number;
  deducaoPorDependente?: number;
  tenantId?: string;
}

/**
 * INSS progressivo por faixas. Cada faixa contribui com a alíquota sobre a
 * parcela do salário que cai dentro dela (modelo progressivo vigente no Brasil).
 * Se a tabela vier vazia, usa fallback simplificado de 11% (teto aproximado).
 */
export function calcularInss(salario: number, faixas: FaixaInss[]): number {
  if (salario <= 0) return 0;
  const ordenadas = [...faixas].sort((a, b) => a.salarioMinimo - b.salarioMinimo);
  if (!ordenadas.length) {
    return round2(Math.min(salario * 0.11, 951.62));
  }
  let inss = 0;
  let pisoAnterior = 0;
  for (const f of ordenadas) {
    if (salario <= f.salarioMinimo - 0.01) break;
    // parcela do salário que cai dentro desta faixa
    const topoFaixa = Math.min(salario, f.salarioMaximo);
    const parcela = topoFaixa - pisoAnterior;
    if (parcela > 0) inss += parcela * (f.aliquota / 100);
    pisoAnterior = f.salarioMaximo;
    if (salario <= f.salarioMaximo) break;
  }
  return round2(inss);
}

/**
 * IRRF: base = bruto - INSS - (dependentes * deducaoPorDependente).
 * Seleciona a faixa pela base e aplica aliquota e parcela a deduzir.
 */
export function calcularIrrf(
  bruto: number,
  inss: number,
  dependentes: number,
  faixas: FaixaIrrf[],
): { base: number; valor: number } {
  const ordenadas = [...faixas].sort((a, b) => a.baseMinima - b.baseMinima);
  const deducaoDep = (ordenadas[0]?.deducaoPorDependente ?? 189.59) * (dependentes || 0);
  const base = Math.max(0, bruto - inss - deducaoDep);
  if (!ordenadas.length) {
    return { base: round2(base), valor: 0 };
  }
  const faixa = ordenadas.find(f => base >= f.baseMinima && base <= f.baseMaxima)
    ?? ordenadas[ordenadas.length - 1];
  const valor = Math.max(0, base * (faixa.aliquota / 100) - faixa.deducao);
  return { base: round2(base), valor: round2(valor) };
}

export function calcularFgts(base: number): number {
  return round2(base * 0.08);
}

export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
