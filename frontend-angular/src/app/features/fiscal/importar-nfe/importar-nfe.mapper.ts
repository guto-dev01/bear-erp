import { NotaImportada } from '../engine/importador-xml-nfe';

/**
 * Mapeamento puro RetornoDistribuicao → linhas da tela Importar NF-e.
 * Sem Angular/Appwrite de propósito: testável em node (importar-nfe.mapper.spec.ts).
 */

/** Linha exibida na tabela de documentos. */
export interface NotaView {
  chave: string;
  numero: string;
  serie: string;
  emitente: string;
  cnpjEmitente: string;
  emissao: string | null;
  valor: number | null;
  tipo: string;
  /** 'procNFe' | 'resNFe' no fluxo do cofre; o worker também traz eventos ('procEventoNFe'/'resEvento'). */
  tipoRaw: string;
  status: string;
}

/**
 * Subconjunto estrutural de `RetornoDistribuicao` (fiscal.service) que a tela
 * consome — replicado aqui para o mapper não arrastar o service (Appwrite) no teste.
 */
export interface RetornoDistribuicaoView {
  ok: boolean;
  erro?: string;
  escrituradas?: number;
  duplicadas?: number;
  /** NF-e completas do lote (novas e já existentes). */
  notas?: NotaImportada[];
  /** Resumos (resNFe) pendentes de manifestação. */
  resumos?: NotaImportada[];
  totalDocs?: number;
  ultNSU?: string;
  maxNSU?: string;
}

/** cSitNFe do resumo: 1 autorizada, 2 cancelada, 3 denegada. */
const SITUACAO_RESUMO: Record<string, string> = {
  '1': 'Aguardando XML completo',
  '2': 'Cancelada no emitente',
  '3': 'Denegada',
};

/** Converte uma NotaImportada (completa ou resumo) em linha da tabela. */
export function mapearNota(n: NotaImportada): NotaView {
  const resumo = n.detalhamento === 'resumo';
  return {
    chave: n.chaveAcesso || '',
    numero: n.numero ? String(n.numero) : '—',
    serie: n.serie || '',
    emitente: n.emitenteNome || n.emitenteCnpj || '—',
    cnpjEmitente: n.emitenteCnpj || '',
    emissao: n.dataEmissao || null,
    valor: typeof n.valorTotal === 'number' ? n.valorTotal : null,
    tipo: resumo ? 'Resumo NF-e' : 'NF-e',
    tipoRaw: resumo ? 'resNFe' : 'procNFe',
    status: resumo
      ? (SITUACAO_RESUMO[n.situacao ?? '1'] ?? 'Aguardando XML completo')
      : 'XML completo',
  };
}

/** Monta as linhas da tabela: NF-e completas primeiro, depois resumos pendentes. */
export function montarLinhas(ret: RetornoDistribuicaoView): NotaView[] {
  if (!ret.ok) return [];
  return [...(ret.notas ?? []), ...(ret.resumos ?? [])].map(mapearNota);
}

/** Mensagem-resumo de uma sincronização (snackbar e painel "última sincronização"). */
export function resumoSync(ret: RetornoDistribuicaoView): string {
  if (!ret.ok) return ret.erro || 'Falha na sincronização.';
  const partes = [
    `${ret.totalDocs ?? 0} documento(s)`,
    `${ret.escrituradas ?? 0} escriturada(s)`,
  ];
  if (ret.duplicadas) partes.push(`${ret.duplicadas} já existente(s)`);
  const pendentes = ret.resumos?.length ?? 0;
  if (pendentes) partes.push(`${pendentes} resumo(s) aguardando manifestação`);
  return partes.join(' · ');
}

// ── Fluxo alternativo: worker fiscal_sefaz (A1 avulso, local ou Render) ──────

/**
 * Subconjunto estrutural de `DocumentoSefaz`/`ResultadoSync` (sefaz-import.service)
 * que a tela consome — replicado aqui para o mapper não arrastar o service
 * (HttpClient/environment) no teste em node.
 */
export interface DocumentoSefazView {
  nsu: string;
  document_type: string;
  access_key?: string;
  cnpj_emitente?: string;
  dados?: Record<string, any>;
}

export interface ResultadoSyncView {
  ok: boolean;
  cstat?: number;
  motivo?: string;
  ult_nsu?: string;
  max_nsu?: string;
  consumo_indevido?: boolean;
  documentos?: DocumentoSefazView[];
  erro?: string;
}

const TIPO_WORKER: Record<string, string> = {
  procNFe: 'NF-e', resNFe: 'Resumo NF-e', procEventoNFe: 'Evento', resEvento: 'Resumo evento',
};
const STATUS_WORKER: Record<string, string> = {
  procNFe: 'XML completo', resNFe: 'Aguardando XML completo',
  procEventoNFe: 'Operação confirmada', resEvento: 'Resumo encontrado',
};

/** Converte um documento devolvido pelo worker em linha da tabela. */
export function mapearDocumentoWorker(d: DocumentoSefazView): NotaView {
  const dd = d.dados || {};
  return {
    chave: d.access_key || '',
    numero: dd['nNF'] || '—',
    serie: dd['serie'] || '',
    emitente: dd['xNome'] || d.cnpj_emitente || '—',
    cnpjEmitente: d.cnpj_emitente || '',
    emissao: dd['dhEmi'] || dd['dhEvento'] || null,
    valor: dd['vNF'] != null ? Number(dd['vNF']) : null,
    tipo: TIPO_WORKER[d.document_type] || d.document_type,
    tipoRaw: d.document_type,
    status: STATUS_WORKER[d.document_type] || 'Desconhecida',
  };
}

/**
 * Filtro de período da tela: true se a emissão cai nos últimos `meses` meses
 * (contados de `agora`). `meses = 0` desliga o filtro (aceita tudo, inclusive
 * nota sem data); com filtro ativo, nota sem data ou com data inválida sai.
 */
export function dentroDoPeriodo(emissao: string | null, meses: number, agora: Date = new Date()): boolean {
  if (!meses) return true;
  if (!emissao) return false;
  const d = new Date(emissao);
  if (isNaN(d.getTime())) return false;
  const limite = new Date(agora);
  limite.setMonth(limite.getMonth() - meses);
  return d >= limite;
}

/** Mensagem-resumo de uma sincronização feita pelo worker (o worker não escritura). */
export function resumoSyncWorker(res: ResultadoSyncView): string {
  if (!res.ok) return res.erro || 'Falha na sincronização.';
  const partes = [
    res.cstat != null ? `cStat ${res.cstat}` : '',
    res.motivo || '',
    `${res.documentos?.length ?? 0} documento(s)`,
  ].filter(Boolean);
  return partes.join(' · ');
}
