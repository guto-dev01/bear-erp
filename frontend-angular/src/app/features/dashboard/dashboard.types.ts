// Shared view-model types for the Dashboard and its presentational sub-components.
// Kept framework-free so the container owns all data-fetching/formatting logic.

/** A month-over-month variation. `null` when there is no historical base to compare. */
export type Trend = { value: string; up: boolean } | null;

export type MetricTheme = 'blue' | 'purple' | 'orange' | 'green' | 'pink';

export interface MetricCardData {
  title: string;
  value: string;
  sublabel: string;
  icon: string;
  theme: MetricTheme;
  route: string;
  /** Variação real vs. período anterior. Oculta quando não há base de comparação. */
  trend: Trend;
  /** Série para o mini-gráfico. Vazio → sparkline oculto (sem dado histórico). */
  spark: number[];
}

export interface AlertItem {
  label: string;
  count: number;
  icon: string;
  type: 'error' | 'warning' | 'info' | 'purple';
  route: string;
}

export interface FinanceSummary {
  receita: number;
  despesa: number;
  lucro: number;
  receitaTrend: Trend;
  despesaTrend: Trend;
  lucroTrend: Trend;
  /** Séries diárias acumuladas da competência selecionada. */
  serieReceita: number[];
  serieDespesa: number[];
  labels: string[];
}

export interface CashFlow {
  entrada: number;
  saida: number;
  saldo: number;
}

export interface TopCompany {
  nome: string;
  valor: number;
  /** Percentual relativo ao maior faturamento da lista (0–100). */
  pct: number;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  icon: string;
  type: string;
  time: string;
}

export type Periodo = 'atual' | 'anterior';
