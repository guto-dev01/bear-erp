/**
 * Apuração fiscal periódica (ICMS e IPI) — módulo PURO.
 *
 * Consolida as notas fiscais de uma competência separando ENTRADAS (créditos)
 * de SAÍDAS (débitos), aplica o saldo credor transportado da competência
 * anterior e devolve o valor a recolher e o novo saldo credor a transportar.
 * Substitui a heurística `creditos = 0` da apuração anterior.
 *
 * Cobertura nesta fase:
 *  - ICMS próprio: débito (saídas) × crédito (entradas), com saldo credor transportável;
 *  - IPI: idem (indústria/equiparado a industrial);
 *  - ICMS-ST, DIFAL e FCP das saídas: apurados em separado (recolhidos à parte
 *    do ICMS próprio — não compõem o confronto débito × crédito).
 *
 * No Simples Nacional o ICMS/IPI é recolhido no DAS — não há apuração por
 * confronto débito × crédito; nesse regime os impostos retornam zerados
 * (a apuração do Simples é objeto da Fase 4).
 *
 * Sem dependência de Angular nem de runtime externo: roda no front e em Node.
 * `round2` é replicado localmente (em vez de importado do motor) para manter o
 * módulo autossuficiente e testável isoladamente.
 */

import type { RegimeTributario } from './motor-tributario';

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────

export type TipoOperacaoFiscal = 'ENTRADA' | 'SAIDA';

/** Subconjunto do cabeçalho de uma nota necessário à apuração periódica. */
export interface NotaApuravel {
  /** Operação sob a ótica da empresa: ENTRADA (compra) ou SAIDA (venda). */
  tipoOperacao?: TipoOperacaoFiscal | string;
  /** Modelo/tipo do documento ('NFE', 'NFSE', …) — usado só como rótulo. */
  tipo?: string;
  status?: string;
  valorTotal?: number;
  valorICMS?: number;
  valorICMSST?: number;
  valorIPI?: number;
  valorDifal?: number;
  valorFCP?: number;
}

/** Saldos credores transportados da competência anterior. */
export interface SaldosCredores {
  icms?: number;
  ipi?: number;
}

/** Resultado da apuração de um imposto com mecânica de confronto débito × crédito. */
export interface ApuracaoImposto {
  debitos: number;
  creditos: number;
  saldoCredorAnterior: number;
  /** débitos − créditos − saldo credor anterior (negativo ⇒ saldo credor). */
  saldoApurado: number;
  /** max(saldoApurado, 0) — valor a recolher na competência. */
  valorRecolher: number;
  /** max(−saldoApurado, 0) — saldo credor que transporta para a competência seguinte. */
  saldoCredorTransportar: number;
}

/** Resultado consolidado da apuração de uma competência. */
export interface ResultadoApuracao {
  icms: ApuracaoImposto;
  ipi: ApuracaoImposto;
  /** ICMS-ST destacado nas saídas (empresa substituta) — recolhido à parte. */
  icmsStRecolher: number;
  /** DIFAL destacado nas saídas interestaduais a consumidor final — recolhido à parte. */
  difalRecolher: number;
  /** FCP destacado nas saídas — recolhido à parte. */
  fcpRecolher: number;
  /** Base de referência: valor total das saídas no período. */
  baseCalculoSaidas: number;
  /** true quando o regime não comporta apuração por confronto (Simples → DAS). */
  semApuracaoNormal: boolean;
}

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

/**
 * Classifica a nota como ENTRADA somente quando marcada explicitamente; na
 * ausência de `tipoOperacao` (notas legadas) é tratada como SAÍDA — preservando
 * o comportamento anterior em que toda NF-e contava como débito.
 */
export function isEntrada(nota: NotaApuravel): boolean {
  return String(nota.tipoOperacao ?? '').toUpperCase() === 'ENTRADA';
}

export function isSaida(nota: NotaApuravel): boolean {
  return !isEntrada(nota);
}

/** Apura um imposto pelo confronto débitos × créditos × saldo credor anterior. */
function apurarImposto(debitos: number, creditos: number, saldoAnterior: number): ApuracaoImposto {
  const d = round2(debitos);
  const c = round2(creditos);
  const sa = round2(saldoAnterior);
  const saldoApurado = round2(d - c - sa);
  return {
    debitos: d,
    creditos: c,
    saldoCredorAnterior: sa,
    saldoApurado,
    valorRecolher: Math.max(saldoApurado, 0),
    saldoCredorTransportar: Math.max(round2(-saldoApurado), 0),
  };
}

// ────────────────────────────────────────────────────────────
// Apuração da competência
// ────────────────────────────────────────────────────────────

/**
 * Apura ICMS e IPI de uma competência a partir das notas já filtradas (mesmo
 * período, mesma empresa, autorizadas). Os saldos credores anteriores vêm da
 * apuração da competência anterior.
 */
export function apurarPeriodo(
  notas: NotaApuravel[],
  saldosAnteriores: SaldosCredores = {},
  opts: { regime?: RegimeTributario } = {},
): ResultadoApuracao {
  const saidas = notas.filter(isSaida);
  const entradas = notas.filter(isEntrada);
  const soma = (arr: NotaApuravel[], sel: (n: NotaApuravel) => unknown): number =>
    round2(arr.reduce((s, n) => s + num(sel(n)), 0));

  const semApuracaoNormal = opts.regime === 'SIMPLES';

  const icmsDebitos = semApuracaoNormal ? 0 : soma(saidas, n => n.valorICMS);
  const icmsCreditos = semApuracaoNormal ? 0 : soma(entradas, n => n.valorICMS);
  const ipiDebitos = semApuracaoNormal ? 0 : soma(saidas, n => n.valorIPI);
  const ipiCreditos = semApuracaoNormal ? 0 : soma(entradas, n => n.valorIPI);

  return {
    icms: apurarImposto(icmsDebitos, icmsCreditos, semApuracaoNormal ? 0 : num(saldosAnteriores.icms)),
    ipi: apurarImposto(ipiDebitos, ipiCreditos, semApuracaoNormal ? 0 : num(saldosAnteriores.ipi)),
    icmsStRecolher: semApuracaoNormal ? 0 : soma(saidas, n => n.valorICMSST),
    difalRecolher: semApuracaoNormal ? 0 : soma(saidas, n => n.valorDifal),
    fcpRecolher: semApuracaoNormal ? 0 : soma(saidas, n => n.valorFCP),
    baseCalculoSaidas: soma(saidas, n => n.valorTotal),
    semApuracaoNormal,
  };
}
