/**
 * Tipos de domínio do módulo Fiscal, alinhados às collections do Appwrite
 * (scripts/appwrite-setup.js) e ao motor de cálculo tributário.
 *
 * Aqui também ficam os mapeadores que convertem o cadastro do produto e o
 * cabeçalho da nota nas entradas que o motor (`motor-tributario.ts`) espera.
 */

import {
  ConfigTributariaItem,
  ContextoFiscal,
  ItemFiscal,
  RegimeTributario,
  TipoOperacao,
} from './engine/motor-tributario';

// ────────────────────────────────────────────────────────────
// Documentos persistidos (espelham o schema)
// ────────────────────────────────────────────────────────────

/** Perfil tributário de um produto (subset fiscal da collection `produtos`). */
export interface ProdutoFiscal {
  origem?: string;
  cstIcms?: string;
  csosn?: string;
  aliqIcms?: number;
  redBcIcms?: number;
  mva?: number;
  aliqIcmsSt?: number;
  aliqFcp?: number;
  cstIpi?: string;
  aliqIpi?: number;
  cstPis?: string;
  aliqPis?: number;
  cstCofins?: string;
  aliqCofins?: number;
  aliqIss?: number;
}

/** Documento da collection `produtos`. */
export interface ProdutoDoc extends ProdutoFiscal {
  $id: string;
  codigo: string;
  descricao: string;
  tipo: string; // PRODUTO | SERVICO
  unidade?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  preco?: number;
}

/** Documento da collection `itens_nota_fiscal`. */
export interface ItemNotaFiscalDoc {
  $id?: string;
  notaId: string;
  numeroItem?: number;
  produtoId?: string;
  codigo?: string;
  descricao?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  unidade?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorProdutos?: number;
  desconto?: number;
  frete?: number;
  seguro?: number;
  outras?: number;
  origem?: string;
  cstIcms?: string;
  csosn?: string;
  baseIcms?: number;
  aliqIcms?: number;
  valorIcms?: number;
  valorIcmsDesonerado?: number;
  baseIcmsSt?: number;
  valorIcmsSt?: number;
  valorFcp?: number;
  valorFcpSt?: number;
  valorDifal?: number;
  cstIpi?: string;
  baseIpi?: number;
  aliqIpi?: number;
  valorIpi?: number;
  cstPis?: string;
  aliqPis?: number;
  valorPis?: number;
  cstCofins?: string;
  aliqCofins?: number;
  valorCofins?: number;
  aliqIss?: number;
  valorIss?: number;
  valorTotalItem?: number;
  empresaId: string;
  tenantId: string;
}

/** Documento da collection `regras_tributarias`. */
export interface RegraTributariaDoc {
  $id?: string;
  nome: string;
  ncm?: string;
  ufOrigem?: string;
  ufDestino?: string;
  tipoOperacao?: TipoOperacao;
  regime?: RegimeTributario;
  cfop?: string;
  origem?: string;
  cstIcms?: string;
  csosn?: string;
  aliqIcms?: number;
  redBcIcms?: number;
  mva?: number;
  aliqIcmsSt?: number;
  aliqFcp?: number;
  cstIpi?: string;
  aliqIpi?: number;
  cstPis?: string;
  aliqPis?: number;
  cstCofins?: string;
  aliqCofins?: number;
  aliqIss?: number;
  ativo?: boolean;
  empresaId: string;
  tenantId: string;
}

/** Cabeçalho da nota usado para montar o {@link ContextoFiscal}. */
export interface CabecalhoNota {
  regime: RegimeTributario;
  tipoOperacao: TipoOperacao;
  ufEmitente: string;
  ufDestino: string;
  consumidorFinal: boolean;
  contribuinteIcms: boolean;
}

/** Linha informada na emissão (produto + quantidade/valores + overrides). */
export interface LinhaEmissao {
  produtoId?: string;
  codigo?: string;
  descricao?: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  unidade?: string;
  quantidade: number;
  valorUnitario: number;
  desconto?: number;
  frete?: number;
  seguro?: number;
  outras?: number;
  servico?: boolean;
  /** Perfil tributário do item (do produto e/ou regra), já resolvido. */
  config: ConfigTributariaItem;
}

// ────────────────────────────────────────────────────────────
// Mapeadores produto/regra → entradas do motor
// ────────────────────────────────────────────────────────────

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? undefined : n;
};

/**
 * Resolve a configuração tributária de um item combinando, nessa ordem de
 * precedência: regra tributária aplicável → cadastro do produto → defaults.
 * Campos definidos numa fonte de maior precedência sobrescrevem os demais.
 */
export function resolverConfigTributaria(
  produto?: ProdutoFiscal | null,
  regra?: RegraTributariaDoc | null,
): ConfigTributariaItem {
  const p: ProdutoFiscal = produto ?? {};
  const r: Partial<RegraTributariaDoc> = regra ?? {};
  const pick = (a: unknown, b: unknown) => (a ?? b) as string | undefined;
  const pickN = (a: unknown, b: unknown) => num(a) ?? num(b);
  return {
    origem: pick(r.origem, p.origem) ?? '0',
    cstIcms: pick(r.cstIcms, p.cstIcms),
    csosn: pick(r.csosn, p.csosn),
    aliqIcms: pickN(r.aliqIcms, p.aliqIcms),
    redBcIcms: pickN(r.redBcIcms, p.redBcIcms),
    mva: pickN(r.mva, p.mva),
    aliqIcmsSt: pickN(r.aliqIcmsSt, p.aliqIcmsSt),
    aliqFcp: pickN(r.aliqFcp, p.aliqFcp),
    cstIpi: pick(r.cstIpi, p.cstIpi),
    aliqIpi: pickN(r.aliqIpi, p.aliqIpi),
    cstPis: pick(r.cstPis, p.cstPis),
    aliqPis: pickN(r.aliqPis, p.aliqPis),
    cstCofins: pick(r.cstCofins, p.cstCofins),
    aliqCofins: pickN(r.aliqCofins, p.aliqCofins),
    aliqIss: pickN(r.aliqIss, p.aliqIss),
  };
}

/** Converte o cabeçalho da nota no contexto fiscal do motor. */
export function montarContexto(cab: CabecalhoNota): ContextoFiscal {
  return {
    regime: cab.regime,
    operacao: cab.tipoOperacao,
    ufOrigem: cab.ufEmitente,
    ufDestino: cab.ufDestino,
    consumidorFinal: cab.consumidorFinal,
    contribuinteIcms: cab.contribuinteIcms,
  };
}

/** Converte uma linha de emissão no item que o motor calcula. */
export function montarItemFiscal(linha: LinhaEmissao): ItemFiscal {
  return {
    descricao: linha.descricao,
    ncm: linha.ncm,
    cfop: linha.cfop,
    quantidade: linha.quantidade,
    valorUnitario: linha.valorUnitario,
    desconto: linha.desconto,
    frete: linha.frete,
    seguro: linha.seguro,
    outras: linha.outras,
    servico: linha.servico,
    config: linha.config,
  };
}
