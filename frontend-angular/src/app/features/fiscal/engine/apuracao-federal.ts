/**
 * Apuração federal — PIS/COFINS, IRPJ/CSLL e Simples Nacional (DAS). Módulo PURO.
 *
 * Cobertura nesta fase:
 *  - PIS/COFINS: confronto débito (saídas) × crédito (entradas) com saldo credor
 *    transportável. Regime CUMULATIVO (Presumido — 0,65%/3%, SEM crédito) e
 *    NÃO-CUMULATIVO (Real — 1,65%/7,6%, COM crédito de entradas). Substitui o
 *    `creditos = 0` da apuração anterior. Simples recolhe no DAS → não apura.
 *  - IRPJ/CSLL Lucro Presumido: base por presunção da receita, IRPJ 15% +
 *    adicional 10% sobre o que exceder R$ 20.000/mês no período, CSLL 9%.
 *  - Simples Nacional: DAS pela alíquota efetiva — (RBT12 × alíq.nominal − PD) /
 *    RBT12 — sobre a receita do mês, anexos I a V (LC 123/2006, tabelas vigentes).
 *
 * Lucro Real (IRPJ/CSLL sobre o lucro contábil ajustado/LALUR) depende do
 * resultado do módulo contábil e fica para uma evolução futura.
 *
 * Sem dependência de Angular nem de runtime externo: roda no front e em Node.
 * Os helpers `round2`/`num`/`isEntrada`/`isSaida` são replicados localmente para
 * manter o módulo autossuficiente e testável isoladamente.
 */

import type { RegimeTributario } from './motor-tributario';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Arredonda a 2 casas decimais (padrão SEFAZ/SPED). */
function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Coage qualquer valor a um número finito (0 quando ausente/NaN). */
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return isNaN(n) ? 0 : n;
}

// ════════════════════════════════════════════════════════════
// PIS / COFINS
// ════════════════════════════════════════════════════════════

export type RegimeFederal = 'CUMULATIVO' | 'NAO_CUMULATIVO';

/** Subconjunto de uma nota necessário à apuração de PIS/COFINS. */
export interface NotaContribuicao {
  tipoOperacao?: string;
  status?: string;
  valorTotal?: number;
  valorPIS?: number;
  valorCOFINS?: number;
}

/** Resultado da apuração de uma contribuição (PIS ou COFINS). */
export interface ApuracaoContribuicao {
  debitos: number;
  creditos: number;
  retido: number;
  saldoCredorAnterior: number;
  /** débitos − créditos − retido − saldo credor anterior (negativo ⇒ saldo credor). */
  saldoApurado: number;
  valorRecolher: number;
  saldoCredorTransportar: number;
  /** Alíquota nominal aplicada (%) — informativa. */
  aliquota: number;
}

export interface ResultadoPisCofins {
  pis: ApuracaoContribuicao;
  cofins: ApuracaoContribuicao;
  regime: RegimeFederal;
  baseSaidas: number;
  /** true no Simples (recolhe no DAS — sem apuração por confronto). */
  semApuracao: boolean;
}

/** Alíquotas por regime federal (%). */
const ALIQUOTAS_CONTRIBUICAO: Record<RegimeFederal, { pis: number; cofins: number }> = {
  CUMULATIVO: { pis: 0.65, cofins: 3.0 },
  NAO_CUMULATIVO: { pis: 1.65, cofins: 7.6 },
};

function isEntrada(n: NotaContribuicao): boolean {
  return String(n.tipoOperacao ?? '').toUpperCase() === 'ENTRADA';
}

function apurarContribuicao(
  debitos: number,
  creditos: number,
  retido: number,
  saldoAnterior: number,
  aliquota: number,
): ApuracaoContribuicao {
  const d = round2(debitos);
  const c = round2(creditos);
  const r = round2(retido);
  const sa = round2(saldoAnterior);
  const saldoApurado = round2(d - c - r - sa);
  return {
    debitos: d,
    creditos: c,
    retido: r,
    saldoCredorAnterior: sa,
    saldoApurado,
    valorRecolher: Math.max(saldoApurado, 0),
    saldoCredorTransportar: Math.max(round2(-saldoApurado), 0),
    aliquota,
  };
}

/**
 * Apura PIS e COFINS de uma competência. Usa o valor destacado nas notas;
 * quando nenhuma saída traz o valor destacado, estima pela alíquota do regime
 * sobre a base das saídas (mantém o comportamento da apuração anterior).
 */
export function apurarPisCofins(
  notas: NotaContribuicao[],
  saldosAnteriores: { pis?: number; cofins?: number } = {},
  opts: { regime?: RegimeTributario; retidoPis?: number; retidoCofins?: number } = {},
): ResultadoPisCofins {
  const semApuracao = opts.regime === 'SIMPLES';
  const regime: RegimeFederal = opts.regime === 'REAL' ? 'NAO_CUMULATIVO' : 'CUMULATIVO';
  const aliq = ALIQUOTAS_CONTRIBUICAO[regime];

  const saidas = notas.filter(n => !isEntrada(n));
  const entradas = notas.filter(isEntrada);
  const soma = (arr: NotaContribuicao[], sel: (n: NotaContribuicao) => unknown): number =>
    round2(arr.reduce((s, n) => s + num(sel(n)), 0));

  const baseSaidas = soma(saidas, n => n.valorTotal);

  if (semApuracao) {
    const zero = apurarContribuicao(0, 0, 0, 0, 0);
    return { pis: zero, cofins: { ...zero }, regime, baseSaidas, semApuracao };
  }

  // Débito: valor destacado nas saídas; sem destaque ⇒ estimativa pela alíquota.
  const pisDestacado = soma(saidas, n => n.valorPIS);
  const cofinsDestacado = soma(saidas, n => n.valorCOFINS);
  const pisDebito = pisDestacado > 0 ? pisDestacado : round2(baseSaidas * (aliq.pis / 100));
  const cofinsDebito = cofinsDestacado > 0 ? cofinsDestacado : round2(baseSaidas * (aliq.cofins / 100));

  // Crédito: somente no regime não-cumulativo, a partir das entradas.
  const pisCredito = regime === 'NAO_CUMULATIVO' ? soma(entradas, n => n.valorPIS) : 0;
  const cofinsCredito = regime === 'NAO_CUMULATIVO' ? soma(entradas, n => n.valorCOFINS) : 0;

  return {
    pis: apurarContribuicao(pisDebito, pisCredito, num(opts.retidoPis), num(saldosAnteriores.pis), aliq.pis),
    cofins: apurarContribuicao(cofinsDebito, cofinsCredito, num(opts.retidoCofins), num(saldosAnteriores.cofins), aliq.cofins),
    regime,
    baseSaidas,
    semApuracao,
  };
}

// ════════════════════════════════════════════════════════════
// IRPJ / CSLL — Lucro Presumido
// ════════════════════════════════════════════════════════════

export type AtividadePresumido = 'COMERCIO' | 'INDUSTRIA' | 'SERVICOS' | 'TRANSPORTE_CARGA' | 'TRANSPORTE_PASSAGEIROS' | 'REVENDA_COMBUSTIVEL';

/** Percentuais de presunção (%) de IRPJ e CSLL por atividade. */
const PRESUNCAO: Record<AtividadePresumido, { irpj: number; csll: number }> = {
  COMERCIO: { irpj: 8, csll: 12 },
  INDUSTRIA: { irpj: 8, csll: 12 },
  REVENDA_COMBUSTIVEL: { irpj: 1.6, csll: 12 },
  TRANSPORTE_CARGA: { irpj: 8, csll: 12 },
  TRANSPORTE_PASSAGEIROS: { irpj: 16, csll: 12 },
  SERVICOS: { irpj: 32, csll: 32 },
};

export interface ResultadoIrpjCsll {
  receitaBruta: number;
  atividade: AtividadePresumido;
  baseIrpj: number;
  irpj: number;
  adicionalIrpj: number;
  irpjTotal: number;
  baseCsll: number;
  csll: number;
  /** Total federal sobre o lucro presumido no período. */
  totalRecolher: number;
}

/**
 * Apura IRPJ e CSLL pelo Lucro Presumido para um período (trimestre por padrão).
 *
 *  - Base IRPJ/CSLL = receita × percentual de presunção (+ outras receitas/ganhos);
 *  - IRPJ = 15% da base + adicional de 10% sobre o que exceder R$ 20.000 × meses;
 *  - CSLL = 9% da base.
 */
export function apurarIrpjCsllPresumido(
  receitaBruta: number,
  opts: { atividade?: AtividadePresumido; outrasReceitas?: number; mesesNoPeriodo?: number } = {},
): ResultadoIrpjCsll {
  const atividade = opts.atividade ?? 'COMERCIO';
  const p = PRESUNCAO[atividade];
  const receita = round2(num(receitaBruta));
  const outras = round2(num(opts.outrasReceitas));
  const meses = opts.mesesNoPeriodo ?? 3;

  const baseIrpj = round2(receita * (p.irpj / 100) + outras);
  const baseCsll = round2(receita * (p.csll / 100) + outras);

  const irpj = round2(baseIrpj * 0.15);
  const limiteAdicional = 20000 * meses;
  const adicionalIrpj = round2(Math.max(baseIrpj - limiteAdicional, 0) * 0.10);
  const irpjTotal = round2(irpj + adicionalIrpj);
  const csll = round2(baseCsll * 0.09);

  return {
    receitaBruta: receita,
    atividade,
    baseIrpj,
    irpj,
    adicionalIrpj,
    irpjTotal,
    baseCsll,
    csll,
    totalRecolher: round2(irpjTotal + csll),
  };
}

// ════════════════════════════════════════════════════════════
// Simples Nacional — DAS
// ════════════════════════════════════════════════════════════

export type AnexoSimples = 'I' | 'II' | 'III' | 'IV' | 'V';

interface FaixaSimples {
  /** Limite superior de RBT12 da faixa (R$). */
  ate: number;
  /** Alíquota nominal (%). */
  aliquota: number;
  /** Parcela a deduzir (R$). */
  deduzir: number;
}

/** Tabelas vigentes do Simples Nacional (LC 123/2006, Anexos I–V). */
const TABELAS_SIMPLES: Record<AnexoSimples, FaixaSimples[]> = {
  I: [
    { ate: 180000, aliquota: 4.0, deduzir: 0 },
    { ate: 360000, aliquota: 7.3, deduzir: 5940 },
    { ate: 720000, aliquota: 9.5, deduzir: 13860 },
    { ate: 1800000, aliquota: 10.7, deduzir: 22500 },
    { ate: 3600000, aliquota: 14.3, deduzir: 87300 },
    { ate: 4800000, aliquota: 19.0, deduzir: 378000 },
  ],
  II: [
    { ate: 180000, aliquota: 4.5, deduzir: 0 },
    { ate: 360000, aliquota: 7.8, deduzir: 5940 },
    { ate: 720000, aliquota: 10.0, deduzir: 13860 },
    { ate: 1800000, aliquota: 11.2, deduzir: 22500 },
    { ate: 3600000, aliquota: 14.7, deduzir: 85500 },
    { ate: 4800000, aliquota: 30.0, deduzir: 720000 },
  ],
  III: [
    { ate: 180000, aliquota: 6.0, deduzir: 0 },
    { ate: 360000, aliquota: 11.2, deduzir: 9360 },
    { ate: 720000, aliquota: 13.5, deduzir: 17640 },
    { ate: 1800000, aliquota: 16.0, deduzir: 35640 },
    { ate: 3600000, aliquota: 21.0, deduzir: 125640 },
    { ate: 4800000, aliquota: 33.0, deduzir: 648000 },
  ],
  IV: [
    { ate: 180000, aliquota: 4.5, deduzir: 0 },
    { ate: 360000, aliquota: 9.0, deduzir: 8100 },
    { ate: 720000, aliquota: 10.2, deduzir: 12420 },
    { ate: 1800000, aliquota: 14.0, deduzir: 39780 },
    { ate: 3600000, aliquota: 22.0, deduzir: 183780 },
    { ate: 4800000, aliquota: 33.0, deduzir: 828000 },
  ],
  V: [
    { ate: 180000, aliquota: 15.5, deduzir: 0 },
    { ate: 360000, aliquota: 18.0, deduzir: 4500 },
    { ate: 720000, aliquota: 19.5, deduzir: 9900 },
    { ate: 1800000, aliquota: 20.5, deduzir: 17100 },
    { ate: 3600000, aliquota: 23.0, deduzir: 62100 },
    { ate: 4800000, aliquota: 30.5, deduzir: 540000 },
  ],
};

export interface ResultadoSimples {
  rbt12: number;
  receitaMes: number;
  anexo: AnexoSimples;
  /** Faixa (1 a 6) em que a RBT12 se enquadra. */
  faixa: number;
  aliquotaNominal: number;
  /** Alíquota efetiva (%) = (RBT12 × nominal − PD) / RBT12. */
  aliquotaEfetiva: number;
  valorDas: number;
  /** true quando RBT12 ultrapassa o teto do Simples (R$ 4,8 mi). */
  foraDoSimples: boolean;
}

/**
 * Calcula o DAS do mês pela alíquota efetiva do Simples Nacional.
 * Na ausência de RBT12 (primeira competência) usa a própria receita do mês como
 * base de enquadramento.
 */
export function calcularDasSimples(
  rbt12: number,
  receitaMes: number,
  opts: { anexo?: AnexoSimples } = {},
): ResultadoSimples {
  const anexo = opts.anexo ?? 'I';
  const tabela = TABELAS_SIMPLES[anexo];
  const receita = round2(num(receitaMes));
  const baseEnquadramento = num(rbt12) > 0 ? round2(num(rbt12)) : receita;

  const idx = tabela.findIndex(f => baseEnquadramento <= f.ate);
  const faixaIdx = idx === -1 ? tabela.length - 1 : idx;
  const faixa = tabela[faixaIdx];
  const foraDoSimples = baseEnquadramento > tabela[tabela.length - 1].ate;

  // Alíquota efetiva; sem base de enquadramento positiva, cai na nominal.
  const aliquotaEfetiva = baseEnquadramento > 0
    ? Math.max(round2(((baseEnquadramento * (faixa.aliquota / 100) - faixa.deduzir) / baseEnquadramento) * 100), 0)
    : faixa.aliquota;
  const valorDas = round2(receita * (aliquotaEfetiva / 100));

  return {
    rbt12: round2(num(rbt12)),
    receitaMes: receita,
    anexo,
    faixa: faixaIdx + 1,
    aliquotaNominal: faixa.aliquota,
    aliquotaEfetiva,
    valorDas,
    foraDoSimples,
  };
}
