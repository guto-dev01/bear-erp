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

/**
 * Filtro do calendário De/Até (inputs type=date, 'YYYY-MM-DD'): true se a
 * emissão cai no intervalo, inclusivo nas duas pontas, interpretado no fuso
 * LOCAL (De = 00:00, Até = 23:59:59.999). Sem nenhuma ponta preenchida aceita
 * tudo; com o filtro ativo, nota sem data ou com data inválida sai.
 */
export function dentroDoIntervalo(emissao: string | null, de: string, ate: string): boolean {
  if (!de && !ate) return true;
  if (!emissao) return false;
  const d = new Date(emissao);
  if (isNaN(d.getTime())) return false;
  if (de) {
    const [a, m, dia] = de.split('-').map(Number);
    if (d < new Date(a, m - 1, dia)) return false;
  }
  if (ate) {
    const [a, m, dia] = ate.split('-').map(Number);
    if (d > new Date(a, m - 1, dia, 23, 59, 59, 999)) return false;
  }
  return true;
}

/** Subconjunto estrutural do doc persistido em `notas_fiscais` (fiscal.service). */
export interface NotaPersistidaView {
  numero?: number;
  serie?: string;
  chaveAcesso?: string;
  dataEmissao?: string;
  emitenteCnpj?: string;
  emitenteNome?: string;
  valorTotal?: number;
}

/** Converte uma nota de entrada já escriturada (coleção `notas_fiscais`) em linha da tabela. */
export function mapearNotaPersistida(d: NotaPersistidaView): NotaView {
  return {
    chave: d.chaveAcesso || '',
    numero: d.numero ? String(d.numero) : '—',
    serie: d.serie || '',
    emitente: d.emitenteNome || d.emitenteCnpj || '—',
    cnpjEmitente: d.emitenteCnpj || '',
    emissao: d.dataEmissao || null,
    valor: typeof d.valorTotal === 'number' ? d.valorTotal : null,
    tipo: 'NF-e',
    tipoRaw: 'procNFe',
    status: 'Escriturada',
  };
}

/**
 * União sem duplicar da tabela: linhas da sincronização atual (status mais
 * fresco) vencem as persistidas de mesma chave; persistidas sem par entram
 * ao final (histórico de sessões anteriores).
 */
export function mesclarLinhas(daSessao: NotaView[], persistidas: NotaView[]): NotaView[] {
  const chaves = new Set(daSessao.map(n => n.chave).filter(Boolean));
  return [...daSessao, ...persistidas.filter(p => !p.chave || !chaves.has(p.chave))];
}

/**
 * Chave do cursor NSU no localStorage — POR empresa E POR ambiente. O NSU é uma
 * sequência independente em homologação e em produção: um cursor compartilhado
 * fazia a troca de ambiente enviar um NSU sem sentido à SEFAZ (rejeição ou
 * documentos silenciosamente pulados → "0 notas").
 */
export function chaveCursorNsu(empresaId: string, ambiente: string): string {
  return `nfe_ultnsu_${empresaId}_${ambiente}`;
}

/**
 * Agrega os retornos parciais dos lotes da Distribuição DF-e (a SEFAZ pagina
 * por NSU em lotes de até 50 docs). Falhou um lote → ok:false com o erro,
 * preservando o que os lotes anteriores já trouxeram.
 */
export function agregarRetornos(parciais: RetornoDistribuicaoView[]): RetornoDistribuicaoView {
  if (!parciais.length) return { ok: false, erro: 'Nenhum lote consultado.' };
  const falha = parciais.find(p => !p.ok);
  const oks = parciais.filter(p => p.ok);
  const soma = (f: (p: RetornoDistribuicaoView) => number | undefined) =>
    oks.reduce((t, p) => t + (f(p) ?? 0), 0);
  const ultimo = oks[oks.length - 1];
  return {
    ok: !falha,
    erro: falha?.erro,
    escrituradas: soma(p => p.escrituradas),
    duplicadas: soma(p => p.duplicadas),
    notas: oks.flatMap(p => p.notas ?? []),
    resumos: oks.flatMap(p => p.resumos ?? []),
    totalDocs: soma(p => p.totalDocs),
    ultNSU: ultimo?.ultNSU,
    maxNSU: ultimo?.maxNSU,
  };
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
