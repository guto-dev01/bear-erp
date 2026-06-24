/**
 * Importador de XML de NF-e (modelo 55) — módulo PURO.
 *
 * Lê o XML de uma NF-e (autorizada: `nfeProc`, ou apenas `NFe`) e extrai o
 * cabeçalho, totais e itens num formato estruturado, pronto para a escrituração
 * de entradas/saídas (Fase 3) e para persistir em `notas_fiscais`/`itens_nota_fiscal`.
 *
 * Não depende de DOMParser nem de bibliotecas externas — usa um parser XML
 * mínimo embutido — por isso roda tanto no navegador quanto em Node/Functions.
 */

// ────────────────────────────────────────────────────────────
// Parser XML mínimo
// ────────────────────────────────────────────────────────────

interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) attrs[m[1]] = m[2];
  return attrs;
}

/** Faz o parse de um XML em árvore. Ignora prefixos de namespace (ex.: `ns:tag` → `tag`). */
export function parseXml(xml: string): XmlNode {
  const root: XmlNode = { tag: '#root', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  const clean = xml.replace(/<\?[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const tokenRe = /<\/?[^>]+>|[^<]+/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(clean))) {
    const token = m[0];
    const cur = stack[stack.length - 1];
    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop();
    } else if (token.startsWith('<')) {
      const selfClose = token.endsWith('/>');
      const inner = token.slice(1, selfClose ? -2 : -1).trim();
      const spaceIdx = inner.search(/\s/);
      const rawTag = spaceIdx === -1 ? inner : inner.slice(0, spaceIdx);
      const tag = rawTag.includes(':') ? rawTag.split(':').pop()! : rawTag;
      const node: XmlNode = {
        tag,
        attrs: spaceIdx === -1 ? {} : parseAttrs(inner.slice(spaceIdx)),
        children: [],
        text: '',
      };
      cur.children.push(node);
      if (!selfClose) stack.push(node);
    } else {
      cur.text += token;
    }
  }
  return root;
}

function child(node: XmlNode | undefined, tag: string): XmlNode | undefined {
  return node?.children.find(c => c.tag === tag);
}

function childrenAll(node: XmlNode | undefined, tag: string): XmlNode[] {
  return node?.children.filter(c => c.tag === tag) ?? [];
}

/** Navega por um caminho de tags (ex.: 'ide.nNF') e devolve o texto do nó. */
function txt(node: XmlNode | undefined, path: string): string {
  let cur: XmlNode | undefined = node;
  for (const part of path.split('.')) {
    cur = child(cur, part);
    if (!cur) return '';
  }
  return cur ? cur.text.trim() : '';
}

function n(node: XmlNode | undefined, path: string): number {
  const v = txt(node, path);
  const f = parseFloat(v);
  return isNaN(f) ? 0 : f;
}

// ────────────────────────────────────────────────────────────
// Tipos do resultado
// ────────────────────────────────────────────────────────────

export interface ItemImportado {
  numeroItem: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cest: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorProdutos: number;
  desconto: number;
  frete: number;
  seguro: number;
  outras: number;
  origem: string;
  cstIcms: string;
  csosn: string;
  baseIcms: number;
  aliqIcms: number;
  valorIcms: number;
  baseIcmsSt: number;
  valorIcmsSt: number;
  aliqIpi: number;
  valorIpi: number;
  valorPis: number;
  valorCofins: number;
}

export interface NotaImportada {
  chaveAcesso: string;
  modelo: string;
  numero: number;
  serie: string;
  dataEmissao: string;
  naturezaOperacao: string;
  /** Perspectiva do EMITENTE do documento: tpNF 0 = ENTRADA, 1 = SAIDA. */
  tipoOperacaoDocumento: 'ENTRADA' | 'SAIDA';
  emitenteCnpj: string;
  emitenteNome: string;
  ufEmitente: string;
  destinatarioCpfCnpj: string;
  destinatarioNome: string;
  ufDestino: string;
  /** indIEDest = 1 → contribuinte do ICMS. */
  contribuinteIcms: boolean;
  valorProdutos: number;
  valorTotal: number;
  valorICMS: number;
  valorICMSST: number;
  valorIPI: number;
  valorPIS: number;
  valorCOFINS: number;
  valorFrete: number;
  valorDesconto: number;
  itens: ItemImportado[];
}

// ────────────────────────────────────────────────────────────
// Mapeamento NF-e → NotaImportada
// ────────────────────────────────────────────────────────────

/** Extrai a data de emissão (dhEmi ISO ou dEmi) em formato YYYY-MM-DD. */
function dataEmissao(ide: XmlNode | undefined): string {
  const dh = txt(ide, 'dhEmi') || txt(ide, 'dEmi');
  return dh ? dh.slice(0, 10) : '';
}

/** Localiza o grupo de ICMS (ICMS00, ICMS10, ICMSSN101, …) dentro de imposto.ICMS. */
function grupoIcms(imposto: XmlNode | undefined): XmlNode | undefined {
  const icms = child(imposto, 'ICMS');
  return icms?.children[0];
}

function mapItem(det: XmlNode): ItemImportado {
  const prod = child(det, 'prod');
  const imposto = child(det, 'imposto');
  const gIcms = grupoIcms(imposto);
  const ipiTrib = child(child(imposto, 'IPI'), 'IPITrib');
  const pis = child(imposto, 'PIS');
  const cofins = child(imposto, 'COFINS');
  const pisGrp = pis?.children[0];
  const cofinsGrp = cofins?.children[0];

  return {
    numeroItem: parseInt(det.attrs['nItem'] || '0', 10),
    codigo: txt(prod, 'cProd'),
    descricao: txt(prod, 'xProd'),
    ncm: txt(prod, 'NCM'),
    cest: txt(prod, 'CEST'),
    cfop: txt(prod, 'CFOP'),
    unidade: txt(prod, 'uCom'),
    quantidade: n(prod, 'qCom'),
    valorUnitario: n(prod, 'vUnCom'),
    valorProdutos: n(prod, 'vProd'),
    desconto: n(prod, 'vDesc'),
    frete: n(prod, 'vFrete'),
    seguro: n(prod, 'vSeg'),
    outras: n(prod, 'vOutro'),
    origem: txt(gIcms, 'orig'),
    cstIcms: txt(gIcms, 'CST'),
    csosn: txt(gIcms, 'CSOSN'),
    baseIcms: n(gIcms, 'vBC'),
    aliqIcms: n(gIcms, 'pICMS'),
    valorIcms: n(gIcms, 'vICMS'),
    baseIcmsSt: n(gIcms, 'vBCST'),
    valorIcmsSt: n(gIcms, 'vICMSST'),
    aliqIpi: n(ipiTrib, 'pIPI'),
    valorIpi: n(ipiTrib, 'vIPI'),
    valorPis: n(pisGrp, 'vPIS'),
    valorCofins: n(cofinsGrp, 'vCOFINS'),
  };
}

/** Importa um XML de NF-e e devolve a nota estruturada. Lança em XML inválido. */
export function importarNfeXml(xml: string): NotaImportada {
  const root = parseXml(xml);
  const proc = child(root, 'nfeProc');
  const nfe = child(proc ?? root, 'NFe');
  const infNFe = child(nfe, 'infNFe');
  if (!infNFe) throw new Error('XML de NF-e inválido: infNFe não encontrado.');

  const ide = child(infNFe, 'ide');
  const emit = child(infNFe, 'emit');
  const dest = child(infNFe, 'dest');
  const total = child(child(infNFe, 'total'), 'ICMSTot');

  const chave = (infNFe.attrs['Id'] || '').replace(/^NFe/, '');
  const tpNF = txt(ide, 'tpNF');
  const itens = childrenAll(infNFe, 'det').map(mapItem);

  return {
    chaveAcesso: chave,
    modelo: txt(ide, 'mod') || '55',
    numero: n(ide, 'nNF'),
    serie: txt(ide, 'serie'),
    dataEmissao: dataEmissao(ide),
    naturezaOperacao: txt(ide, 'natOp'),
    tipoOperacaoDocumento: tpNF === '0' ? 'ENTRADA' : 'SAIDA',
    emitenteCnpj: txt(emit, 'CNPJ') || txt(emit, 'CPF'),
    emitenteNome: txt(emit, 'xNome'),
    ufEmitente: txt(child(emit, 'enderEmit'), 'UF'),
    destinatarioCpfCnpj: txt(dest, 'CNPJ') || txt(dest, 'CPF'),
    destinatarioNome: txt(dest, 'xNome'),
    ufDestino: txt(child(dest, 'enderDest'), 'UF'),
    contribuinteIcms: txt(dest, 'indIEDest') === '1',
    valorProdutos: n(total, 'vProd'),
    valorTotal: n(total, 'vNF'),
    valorICMS: n(total, 'vICMS'),
    valorICMSST: n(total, 'vST'),
    valorIPI: n(total, 'vIPI'),
    valorPIS: n(total, 'vPIS'),
    valorCOFINS: n(total, 'vCOFINS'),
    valorFrete: n(total, 'vFrete'),
    valorDesconto: n(total, 'vDesc'),
    itens,
  };
}
