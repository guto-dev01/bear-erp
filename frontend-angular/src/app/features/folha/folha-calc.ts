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
 * Redutor do IRRF — reforma 2026 (art. 3º-A da Lei 9.250/95, red. Lei 15.270/2025;
 * IN RFB 2.299/2025): redutor = max(0, 978,62 − 0,133145 × R), com R = rendimentos
 * tributáveis mensais. Acima de R$7.350,01 o redutor zera. Versionar por vigência.
 */
export const REDUTOR_IRRF_2026 = {
  coefA: 978.62,
  coefB: 0.133145,
  limiteRendimento: 7350.01,
} as const;

/**
 * Desconto simplificado mensal (25% da 1ª faixa) — alternativo às deduções legais
 * (INSS + dependentes). Aplica-se o que for MAIS benéfico. Vigente desde a MP 1.171/2024.
 */
export const DESCONTO_SIMPLIFICADO_MENSAL = 607.20;

export interface OpcoesIrrf {
  /**
   * R do redutor = rendimento TRIBUTÁVEL mensal (antes das deduções da base).
   * Default = `bruto`. ⚠️ guard-rail: se `bruto` contiver rubricas NÃO tributáveis,
   * o chamador deve passar aqui só a soma das rubricas tributáveis.
   */
  rendimentoTributavel?: number;
  /** Desconto simplificado mensal. Default 607,20. Passe 0 para desabilitar. */
  descontoSimplificado?: number;
  /** Aplica o redutor da reforma 2026. Default true. `false` = IRRF pré-reforma. */
  aplicarRedutor2026?: boolean;
}

/**
 * IRRF mensal com a reforma de 2026.
 *   base    = R − max(deduções legais [INSS + dependentes], desconto simplificado)
 *   apurado = base × alíquota − parcela a deduzir            (tabela progressiva)
 *   redutor = min(apurado, max(0, 978,62 − 0,133145 × R))    (cap: nunca gera imposto negativo)
 *   IRRF    = apurado − redutor
 * Reutilizável para o 13º (calculado em separado): passe o rendimento do 13º como `bruto`/R.
 */
export function calcularIrrf(
  bruto: number,
  inss: number,
  dependentes: number,
  faixas: FaixaIrrf[],
  opts: OpcoesIrrf = {},
): { base: number; valor: number; redutor: number } {
  const ordenadas = [...faixas].sort((a, b) => a.baseMinima - b.baseMinima);
  const deducaoDep = (ordenadas[0]?.deducaoPorDependente ?? 189.59) * (dependentes || 0);
  const descSimplificado = opts.descontoSimplificado ?? DESCONTO_SIMPLIFICADO_MENSAL;
  // desconto simplificado substitui as deduções legais quando for mais vantajoso
  const base = Math.max(0, bruto - Math.max(inss + deducaoDep, descSimplificado));
  if (!ordenadas.length) {
    return { base: round2(base), valor: 0, redutor: 0 };
  }
  const faixa = ordenadas.find(f => base >= f.baseMinima && base <= f.baseMaxima)
    ?? ordenadas[ordenadas.length - 1];
  const apurado = Math.max(0, base * (faixa.aliquota / 100) - faixa.deducao);

  const R = opts.rendimentoTributavel ?? bruto;
  const aplicarRedutor = opts.aplicarRedutor2026 ?? true;
  const redutorFormula = (!aplicarRedutor || R > REDUTOR_IRRF_2026.limiteRendimento)
    ? 0
    : Math.max(0, REDUTOR_IRRF_2026.coefA - REDUTOR_IRRF_2026.coefB * R);
  const redutor = Math.min(apurado, redutorFormula);

  return { base: round2(base), valor: round2(apurado - redutor), redutor: round2(redutor) };
}

export function calcularFgts(base: number): number {
  return round2(base * 0.08);
}

export interface OpcoesDividendos {
  /** Limite mensal de isenção por fonte pagadora × beneficiário. Default 50.000. */
  limiteMensal?: number;
  /** Alíquota da retenção na fonte (%). Default 10. */
  aliquota?: number;
  /** A fonte pagadora é optante do Simples Nacional? */
  fonteSimples?: boolean;
  /**
   * Reter mesmo quando a fonte é do Simples? Default true (entendimento atual da RFB).
   * ⚠️ Tema JUDICIALIZADO (art. 14 LC 123/2006) — há liminares suspendendo a exigência e o
   * STF ainda não decidiu. Flag deixa o ajuste numa linha quando houver decisão definitiva.
   */
  reterSimples?: boolean;
}

/**
 * IRRF de 10% sobre lucros/dividendos pagos por uma MESMA PJ a uma MESMA PF residente,
 * quando o TOTAL pago no mês exceder R$50.000 (art. 6º-A da Lei 9.249/95, red. Lei 15.270/2025).
 * Incide sobre o TOTAL (não sobre o excedente) e SEM deduções. É antecipação (IRPFM),
 * compensável no ajuste anual.
 * ⚠️ guard-rail: gatilho por (CNPJ fonte × CPF beneficiário × competência). O chamador deve
 *    acumular o total do mês e, em múltiplos pagamentos, reter o INCREMENTAL
 *    (= este resultado − o que já foi retido na competência).
 */
export function calcularIrrfDividendos(totalDividendosMes: number, opts: OpcoesDividendos = {}): number {
  const { limiteMensal = 50000, aliquota = 10, fonteSimples = false, reterSimples = true } = opts;
  if (fonteSimples && !reterSimples) return 0;
  if (totalDividendosMes <= limiteMensal) return 0;
  return round2(totalDividendosMes * (aliquota / 100));
}

export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
