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
  tipoRaw: 'procNFe' | 'resNFe';
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
