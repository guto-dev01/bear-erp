// Partida dobrada de um lançamento contábil: validação (Σdéb = Σcréd) e
// serialização para persistência. Módulo PURO (sem Angular) — testável com node.

export interface PartidaLancamento {
  contaId: string;
  tipo: 'DEBITO' | 'CREDITO';
  valor: number;
}

/** Tolerância padrão: diferenças < 1 centavo são ruído de arredondamento (rejeita ≥ 1 centavo). */
export const TOLERANCIA_PARTIDA = 0.01;

export interface ResultadoValidacao {
  ok: boolean;
  erro?: string;
  totalDebito: number;
  totalCredito: number;
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function soma(partidas: PartidaLancamento[], tipo: 'DEBITO' | 'CREDITO'): number {
  return round2(partidas.filter(p => p.tipo === tipo).reduce((s, p) => s + (p.valor || 0), 0));
}

/**
 * Valida a partida dobrada: exige ao menos um débito e um crédito, e
 * Σdébitos ≈ Σcréditos com `|Σdéb − Σcréd| < tolerancia` (default 1 centavo —
 * rejeita 1 centavo de diferença; tolera apenas ruído sub-centavo de arredondamento).
 */
export function validarPartidas(
  partidas: PartidaLancamento[],
  tolerancia = TOLERANCIA_PARTIDA,
): ResultadoValidacao {
  const temDebito = partidas.some(p => p.tipo === 'DEBITO');
  const temCredito = partidas.some(p => p.tipo === 'CREDITO');
  const totalDebito = soma(partidas, 'DEBITO');
  const totalCredito = soma(partidas, 'CREDITO');
  if (!temDebito || !temCredito) {
    return { ok: false, erro: 'Lançamento exige ao menos um débito e um crédito.', totalDebito, totalCredito };
  }
  if (Math.abs(totalDebito - totalCredito) >= tolerancia) {
    return {
      ok: false,
      erro: `Partidas desbalanceadas: débitos ${totalDebito.toFixed(2)} ≠ créditos ${totalCredito.toFixed(2)}.`,
      totalDebito, totalCredito,
    };
  }
  return { ok: true, totalDebito, totalCredito };
}

/**
 * Monta os campos de persistência preservando TODAS as partidas (JSON) + o par
 * primário (1º débito / 1º crédito, para exibição e compatibilidade) + o total.
 * Pressupõe partidas já validadas por {@link validarPartidas}.
 */
export function montarPersistenciaPartidas(partidas: PartidaLancamento[]): {
  partidas: string;
  contaDebitoId: string;
  contaCreditoId: string;
  valor: number;
} {
  const deb = partidas.find(p => p.tipo === 'DEBITO');
  const cred = partidas.find(p => p.tipo === 'CREDITO');
  return {
    partidas: JSON.stringify(partidas),
    contaDebitoId: deb?.contaId ?? '',
    contaCreditoId: cred?.contaId ?? '',
    valor: soma(partidas, 'DEBITO'),
  };
}

/** Lê o campo `partidas` persistido (JSON string do Appwrite) com fallback seguro a []. */
export function parsePartidas(raw: unknown): PartidaLancamento[] {
  if (Array.isArray(raw)) return raw as PartidaLancamento[];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  return [];
}
