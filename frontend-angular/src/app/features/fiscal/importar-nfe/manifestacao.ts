import { NotaView } from './importar-nfe.mapper';

/**
 * Manifestação do Destinatário — módulo PURO (sem Angular/Appwrite), pelo mesmo
 * motivo de `importar-nfe.mapper.ts`: roda em node no `.spec.ts`.
 *
 * POR QUE ISTO EXISTE: a Distribuição DF-e só entrega o RESUMO (`resNFe`) —
 * chave, emitente, data, valor e situação. Itens, NCM/CFOP, destinatário e
 * impostos NÃO existem nesse documento. O XML completo (`procNFe`) só é
 * liberado pela SEFAZ depois que o destinatário registra a **Ciência da
 * Operação (210210)**. Sem manifestar, a tela fica para sempre com meia nota.
 */

/** Eventos de Manifestação do Destinatário. */
export type TpEventoManifestacao = '210200' | '210210' | '210220' | '210240';

export interface EventoManifestacao {
  tpEvento: TpEventoManifestacao;
  rotulo: string;
  descricao: string;
  /** Só 210240 exige justificativa (15–255 caracteres). */
  exigeJustificativa: boolean;
}

export const EVENTOS_MANIFESTACAO: readonly EventoManifestacao[] = [
  {
    tpEvento: '210210',
    rotulo: 'Ciência da operação',
    descricao: 'Libera o download do XML completo. Não é aceite da operação.',
    exigeJustificativa: false,
  },
  {
    tpEvento: '210200',
    rotulo: 'Confirmação da operação',
    descricao: 'Confirma o recebimento. Encerra o ciclo e impede desconhecimento posterior.',
    exigeJustificativa: false,
  },
  {
    tpEvento: '210220',
    rotulo: 'Desconhecimento da operação',
    descricao: 'A empresa não reconhece a operação descrita na nota.',
    exigeJustificativa: false,
  },
  {
    tpEvento: '210240',
    rotulo: 'Operação não realizada',
    descricao: 'A operação foi reconhecida mas não se concretizou (recusa/devolução).',
    exigeJustificativa: true,
  },
];

export const JUSTIFICATIVA_MIN = 15;
export const JUSTIFICATIVA_MAX = 255;

/**
 * Teto de eventos por clique. Cada manifestação é UMA execução da Appwrite
 * Function (corte em 30 s) com handshake mTLS de 1–3 s: 20 ≈ 1 minuto de lote.
 */
export const LOTE_MAX_CIENCIA = 20;

export function eventoPor(tp: TpEventoManifestacao): EventoManifestacao {
  return EVENTOS_MANIFESTACAO.find(e => e.tpEvento === tp) ?? EVENTOS_MANIFESTACAO[0];
}

/** Chave de acesso manifestável: exatamente 44 dígitos. */
export function chaveValida(chave: string | undefined | null): boolean {
  return /^\d{44}$/.test(String(chave ?? '').replace(/\D/g, ''));
}

/** Evento não se manifesta; resumo e NF-e completa sim (desde que com chave). */
export function podeManifestar(n: NotaView): boolean {
  return chaveValida(n.chave) && (n.tipoRaw === 'resNFe' || n.tipoRaw === 'procNFe');
}

/**
 * Resumos em que a Ciência (210210) tem efeito: pendentes do XML completo,
 * situação normal (cSitNFe 1) e ainda não manifestados nesta sessão.
 *
 * Cancelada (2) e denegada (3) ficam de fora do LOTE de propósito — a ciência
 * nelas não libera XML útil e só gasta execução. Individualmente o painel
 * continua permitindo (ex.: registrar Desconhecimento).
 *
 * Deduplica por chave: a mesma nota pode voltar em dois lotes de NSU.
 */
export function pendentesDeCiencia(linhas: readonly NotaView[]): NotaView[] {
  const vistas = new Set<string>();
  return linhas.filter(n => {
    if (n.tipoRaw !== 'resNFe' || !chaveValida(n.chave) || n.manifestada) return false;
    if ((n.situacao ?? '1') !== '1') return false;
    if (vistas.has(n.chave)) return false;
    vistas.add(n.chave);
    return true;
  });
}

/** Chaves do lote, já deduplicadas e limitadas ao teto. */
export function chavesParaCiencia(
  linhas: readonly NotaView[],
  limite: number = LOTE_MAX_CIENCIA,
): string[] {
  return pendentesDeCiencia(linhas).slice(0, limite).map(n => n.chave);
}

/** '' quando válida; mensagem de erro quando não. */
export function validarJustificativa(tp: TpEventoManifestacao, xJust: string): string {
  if (!eventoPor(tp).exigeJustificativa) return '';
  const t = (xJust ?? '').trim();
  if (t.length < JUSTIFICATIVA_MIN) return `A justificativa precisa de ao menos ${JUSTIFICATIVA_MIN} caracteres.`;
  if (t.length > JUSTIFICATIVA_MAX) return `A justificativa passa de ${JUSTIFICATIVA_MAX} caracteres.`;
  return '';
}

export interface ResultadoManifestacao {
  chave: string;
  ok: boolean;
  cStat?: number;
  mensagem: string;
}

/**
 * cStat de evento aceito: 135 registrado e vinculado · 136 registrado sem
 * vínculo · 573 duplicidade (já havia manifestação → idempotente, é sucesso do
 * ponto de vista do usuário). Espelha `registrado` de `_shared/nfe/respostas.js`.
 */
const CSTAT_REGISTRADO = new Set([135, 136, 573]);

/** Retorno cru da Function na operação 'manifestar'. */
export interface RetornoManifestacaoView {
  ok?: boolean;
  erro?: string;
  cStat?: number | null;
  xMotivo?: string;
  registrado?: boolean;
}

/**
 * `ok:true` da Function significa só "a chamada foi"; quem diz se o evento
 * entrou é o cStat. Confia no `registrado` do backend quando ele vem, e cai no
 * conjunto de cStat conhecido quando não vem.
 */
export function interpretarRetorno(
  chave: string,
  r: RetornoManifestacaoView | null | undefined,
): ResultadoManifestacao {
  if (!r?.ok) return { chave, ok: false, mensagem: r?.erro || 'Falha ao manifestar.' };
  const cStat = r.cStat ?? undefined;
  const ok = r.registrado ?? (cStat != null && CSTAT_REGISTRADO.has(cStat));
  return { chave, ok, cStat, mensagem: `${cStat ?? '—'} ${r.xMotivo ?? ''}`.trim() };
}

/** Status da linha depois do evento aceito. */
export function statusPosManifestacao(tp: TpEventoManifestacao): string {
  return tp === '210210'
    ? 'Ciência registrada — puxe as notas de novo'
    : `${eventoPor(tp).rotulo} registrada`;
}

/** Aplica o resultado nas linhas (imutável). Falha não altera nada. */
export function aplicarManifestacao(
  linhas: readonly NotaView[],
  res: ResultadoManifestacao,
  tp: TpEventoManifestacao,
): NotaView[] {
  if (!res.ok) return [...linhas];
  const status = statusPosManifestacao(tp);
  return linhas.map(n => n.chave === res.chave && n.tipoRaw === 'resNFe'
    ? { ...n, manifestada: true, status }
    : n);
}

/**
 * Mensagem-resumo do lote.
 *
 * O aviso de "puxe de novo" é deliberado: NÃO re-sincronizamos sozinhos. A
 * SEFAZ leva alguns minutos para publicar o `procNFe`, e uma consulta que volta
 * sem documentos novos alimenta o consumo indevido (cStat 656) — 1 h de
 * bloqueio por CNPJ. Melhor o usuário puxar quando quiser.
 */
export function resumoLote(
  resultados: readonly ResultadoManifestacao[],
  tp: TpEventoManifestacao,
): string {
  const ok = resultados.filter(r => r.ok).length;
  const falhas = resultados.length - ok;
  const partes = [`${ok} de ${resultados.length} manifestada(s)`];
  if (falhas) partes.push(`${falhas} falhou/falharam`);
  if (ok && tp === '210210') partes.push('a SEFAZ libera o XML completo em alguns minutos — puxe as notas de novo');
  return partes.join(' · ');
}
