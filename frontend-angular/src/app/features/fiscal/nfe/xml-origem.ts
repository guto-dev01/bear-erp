/**
 * De ONDE vem o XML de uma nota já persistida em `notas_fiscais` — módulo PURO
 * (sem Angular/Appwrite: roda em `ng test` e em node).
 *
 * Emissão própria (SAÍDA) é o ÚNICO caso em que gerar o XML pelo motor é
 * correto: o emitente é a empresa logada e a chave de acesso se calcula a
 * partir do CNPJ dela.
 *
 * Documento de TERCEIRO (entrada) é o oposto. Regenerá-lo por
 * `gerarXmlNotaFiscal` produz um arquivo que *parece* a nota e não é:
 *  - o `<emit>` sai com os dados da empresa logada (o fornecedor some);
 *  - a chave de acesso é RECALCULADA com o CNPJ errado (`gerarChaveAcesso`),
 *    então os 44 dígitos exibidos não são os do documento fiscal;
 *  - os totais saem do que houver em `itens_nota_fiscal`, não do XML autorizado.
 * Para esses, ou se devolve o XML original armazenado, ou não se devolve nada —
 * nunca uma reconstrução.
 */

/** Subconjunto de `notas_fiscais` que decide a origem do XML. */
export interface NotaParaXml {
  tipoOperacao?: string;
  emitenteCnpj?: string;
  chaveAcesso?: string;
  xmlOriginal?: string;
}

export type OrigemXml =
  /** XML autorizado do fornecedor, servido verbatim. */
  | { fonte: 'original'; xml: string; chave: string }
  /** Emissão própria: gerar pelo motor (não assinado). */
  | { fonte: 'gerar' }
  /** Terceiro sem XML guardado: recusar em vez de fabricar. */
  | { fonte: 'indisponivel'; motivo: string };

export const MOTIVO_SEM_XML =
  'Documento de terceiro sem o XML original armazenado. Use "Buscar XML na SEFAZ" '
  + '(exige Ciência da Operação) ou reimporte o arquivo — este XML não pode ser '
  + 'regenerado: o emitente e a chave de acesso são do fornecedor.';

const soDigitos = (s?: string): string => (s ?? '').replace(/\D/g, '');

/**
 * Documento de terceiro: entrada declarada, ou emitente diferente da empresa
 * logada. Sem `emitenteCnpj` ou sem CNPJ da empresa não dá para afirmar que é
 * de terceiro — o default é tratar como emissão própria, para não travar a
 * geração do XML de uma NF-e nova (que ainda não tem emitente gravado).
 */
export function ehDocumentoDeTerceiro(nota: NotaParaXml, cnpjEmpresa: string): boolean {
  if (String(nota.tipoOperacao ?? '').toUpperCase() === 'ENTRADA') return true;
  const emit = soDigitos(nota.emitenteCnpj);
  const proprio = soDigitos(cnpjEmpresa);
  return !!emit && !!proprio && emit !== proprio;
}

/** Decide a origem do XML da nota. Ver a nota de arquitetura no topo do arquivo. */
export function resolverOrigemXml(nota: NotaParaXml, cnpjEmpresa: string): OrigemXml {
  if (!ehDocumentoDeTerceiro(nota, cnpjEmpresa)) return { fonte: 'gerar' };
  const xml = (nota.xmlOriginal ?? '').trim();
  if (xml) return { fonte: 'original', xml, chave: nota.chaveAcesso ?? '' };
  return { fonte: 'indisponivel', motivo: MOTIVO_SEM_XML };
}

/**
 * Nome do arquivo no download. Com chave, `NFe<44 dígitos>.xml` (convenção da
 * SEFAZ); sem chave, cai no número da nota. Sanitizado para nome de arquivo.
 */
export function nomeArquivoXml(chave: string, numero: unknown): string {
  const ch = soDigitos(chave);
  const base = ch.length === 44 ? `NFe${ch}` : `NFe-${String(numero ?? 'documento')}`;
  return `${base.replace(/[^a-zA-Z0-9._-]/g, '_')}.xml`;
}
