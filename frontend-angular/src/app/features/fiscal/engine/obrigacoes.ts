/**
 * Calendário de obrigações acessórias por competência e regime — módulo PURO.
 *
 * Dada a competência (mês/ano dos fatos geradores) e o regime tributário, devolve
 * as obrigações com seus vencimentos. As datas usam o dia legal fixo de cada
 * obrigação no mês de entrega; NÃO ajustam para dia útil/feriado (simplificação —
 * o ajuste para o próximo dia útil é uma evolução futura).
 *
 * Sem dependência de Angular nem de runtime externo: roda no front e em Node.
 */

import type { RegimeTributario } from './motor-tributario';

export interface Obrigacao {
  /** Código da obrigação (ex.: 'DCTFWEB'). */
  tipo: string;
  descricao: string;
  /** Vencimento em 'YYYY-MM-DD'. */
  dataVencimento: string;
  /** Periodicidade. */
  periodicidade: 'MENSAL' | 'TRIMESTRAL';
}

interface EspecObrigacao {
  tipo: string;
  descricao: string;
  regimes: RegimeTributario[];
  /** Dia legal do vencimento. */
  dia: number;
  /** Meses após a competência (1 = mês seguinte). */
  mesesAdiante: number;
  /** Quando true, só vence em competências de fechamento de trimestre (mar/jun/set/dez). */
  somenteTrimestre?: boolean;
  periodicidade: 'MENSAL' | 'TRIMESTRAL';
}

/** Catálogo das obrigações cobertas nesta fase. */
const CATALOGO: EspecObrigacao[] = [
  { tipo: 'DAS', descricao: 'DAS — Simples Nacional', regimes: ['SIMPLES'], dia: 20, mesesAdiante: 1, periodicidade: 'MENSAL' },
  { tipo: 'DESTDA', descricao: 'DeSTDA — Declaração Substituição/Diferencial/Antecipação', regimes: ['SIMPLES'], dia: 28, mesesAdiante: 1, periodicidade: 'MENSAL' },
  { tipo: 'EFD_ICMS_IPI', descricao: 'EFD ICMS/IPI (SPED Fiscal)', regimes: ['PRESUMIDO', 'REAL'], dia: 20, mesesAdiante: 1, periodicidade: 'MENSAL' },
  { tipo: 'GIA', descricao: 'GIA — Guia de Informação e Apuração do ICMS', regimes: ['PRESUMIDO', 'REAL'], dia: 16, mesesAdiante: 1, periodicidade: 'MENSAL' },
  { tipo: 'DCTFWEB', descricao: 'DCTFWeb', regimes: ['PRESUMIDO', 'REAL'], dia: 15, mesesAdiante: 1, periodicidade: 'MENSAL' },
  { tipo: 'EFD_REINF', descricao: 'EFD-Reinf', regimes: ['PRESUMIDO', 'REAL'], dia: 15, mesesAdiante: 1, periodicidade: 'MENSAL' },
  { tipo: 'EFD_CONTRIBUICOES', descricao: 'EFD-Contribuições (PIS/COFINS)', regimes: ['PRESUMIDO', 'REAL'], dia: 14, mesesAdiante: 2, periodicidade: 'MENSAL' },
  { tipo: 'IRPJ_CSLL', descricao: 'DARF IRPJ/CSLL (apuração trimestral)', regimes: ['PRESUMIDO', 'REAL'], dia: 30, mesesAdiante: 1, somenteTrimestre: true, periodicidade: 'TRIMESTRAL' },
];

/** Soma `mesesAdiante` à competência (ano, mes) e devolve a data no dia informado. */
function vencimento(ano: number, mes: number, mesesAdiante: number, dia: number): string {
  let a = ano;
  let m = mes + mesesAdiante;
  while (m > 12) { m -= 12; a += 1; }
  // Limita o dia ao último dia do mês (ex.: dia 30 em meses curtos).
  const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const d = Math.min(dia, ultimoDia);
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Descrição amigável de uma obrigação pelo seu código (para exibição na leitura). */
export function descricaoObrigacao(tipo: string): string {
  return CATALOGO.find(e => e.tipo === tipo)?.descricao ?? tipo;
}

/** Gera o calendário de obrigações de uma competência para o regime informado. */
export function calendarioObrigacoes(
  ano: number,
  mes: number,
  opts: { regime?: RegimeTributario } = {},
): Obrigacao[] {
  const regime = opts.regime ?? 'REAL';
  const fechaTrimestre = mes % 3 === 0;
  return CATALOGO
    .filter(e => e.regimes.includes(regime))
    .filter(e => !e.somenteTrimestre || fechaTrimestre)
    .map(e => ({
      tipo: e.tipo,
      descricao: e.descricao,
      dataVencimento: vencimento(ano, mes, e.mesesAdiante, e.dia),
      periodicidade: e.periodicidade,
    }))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
}
