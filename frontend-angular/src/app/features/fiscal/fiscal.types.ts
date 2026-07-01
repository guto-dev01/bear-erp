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
  /** Vigência (YYYY-MM-DD): versiona a regra no tempo (Padrão 5 — regra como dado). */
  vigenciaInicio?: string;
  vigenciaFim?: string;
  empresaId: string;
  tenantId: string;
}

// ────────────────────────────────────────────────────────────
// Seleção de regra tributária por NCM/CFOP/UF/vigência (P1.5)
// ────────────────────────────────────────────────────────────

export interface CriterioRegra {
  ncm?: string;
  cfop?: string;
  ufOrigem?: string;
  ufDestino?: string;
  tipoOperacao?: TipoOperacao;
  regime?: RegimeTributario;
  /** Data do fato gerador (YYYY-MM-DD) — filtra pela vigência. */
  data?: string;
}

/** Campo casa se for curinga (vazio na regra) ou igual ao critério (case-insensitive). */
function campoCasa(regraVal: unknown, criterioVal: unknown): boolean {
  if (regraVal === undefined || regraVal === null || regraVal === '') return true;
  return String(regraVal).toUpperCase() === String(criterioVal ?? '').toUpperCase();
}

/** NCM casa por PREFIXO (regra '1234' cobre item '12345678'); vazio = curinga. */
function ncmCasa(regraNcm: string | undefined, itemNcm: string | undefined): boolean {
  if (!regraNcm) return true;
  return String(itemNcm ?? '').startsWith(String(regraNcm));
}

function dentroVigencia(regra: RegraTributariaDoc, data?: string): boolean {
  if (!data) return true;
  if (regra.vigenciaInicio && data < regra.vigenciaInicio) return false;
  if (regra.vigenciaFim && data > regra.vigenciaFim) return false;
  return true;
}

/** A regra é aplicável ao critério? (ativa, na vigência, e todos os campos casam). */
export function regraAplica(regra: RegraTributariaDoc, criterio: CriterioRegra): boolean {
  if (regra.ativo === false) return false;
  if (!dentroVigencia(regra, criterio.data)) return false;
  return ncmCasa(regra.ncm, criterio.ncm)
    && campoCasa(regra.cfop, criterio.cfop)
    && campoCasa(regra.ufOrigem, criterio.ufOrigem)
    && campoCasa(regra.ufDestino, criterio.ufDestino)
    && campoCasa(regra.tipoOperacao, criterio.tipoOperacao)
    && campoCasa(regra.regime, criterio.regime);
}

/** Especificidade = nº de campos fixados (o mais específico ganha do mais genérico). */
export function especificidade(regra: RegraTributariaDoc): number {
  return [regra.ncm, regra.cfop, regra.ufOrigem, regra.ufDestino, regra.tipoOperacao, regra.regime]
    .filter(v => v !== undefined && v !== null && v !== '').length;
}

/** Seleciona a regra aplicável MAIS específica (desempate: vigência mais recente). */
export function selecionarRegra(regras: RegraTributariaDoc[], criterio: CriterioRegra): RegraTributariaDoc | null {
  const aplicaveis = regras.filter(r => regraAplica(r, criterio));
  if (!aplicaveis.length) return null;
  return aplicaveis.sort((a, b) => {
    const de = especificidade(b) - especificidade(a);
    if (de !== 0) return de;
    return (b.vigenciaInicio ?? '').localeCompare(a.vigenciaInicio ?? '');
  })[0];
}

/** Sobrepõe os campos DEFINIDOS de uma regra sobre uma config base (regra ganha). */
export function mesclarRegraNaConfig(base: ConfigTributariaItem, regra: RegraTributariaDoc): ConfigTributariaItem {
  const daRegra = resolverConfigTributaria(null, regra);
  const out: ConfigTributariaItem = { ...base };
  (Object.keys(daRegra) as Array<keyof ConfigTributariaItem>).forEach(k => {
    const v = daRegra[k];
    if (v !== undefined && v !== null && v !== '') (out as unknown as Record<string, unknown>)[k] = v;
  });
  return out;
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

// ────────────────────────────────────────────────────────────
// Emissão pela tela de NF-e (formulário → entradas do motor) — P0.2
// ────────────────────────────────────────────────────────────

/** Subconjunto do cadastro da empresa necessário ao cabeçalho da emissão. */
export interface EmpresaEmitente {
  uf?: string;
  regimeTributario?: string;
}

/** Valor do formulário da tela de NF-e (cabeçalho + destinatário + itens). */
export interface NfeFormValue {
  tipo?: string;                 // 'SAIDA' | 'ENTRADA'
  naturezaOperacao?: string;
  finalidade?: string;
  /** Operação destinada a consumidor final (dispara o DIFAL em venda interestadual). */
  consumidorFinal?: boolean;
  destinatario?: {
    cnpjCpf?: string;
    razaoSocial?: string;
    inscricaoEstadual?: string;
    uf?: string;
  };
  itens?: Array<{
    descricao?: string;
    ncm?: string;
    cfop?: string;
    quantidade?: number | string;
    valorUnitario?: number | string;
    cstIcms?: string;
    csosn?: string;
    aliquotaIcms?: number | string;
    /** Alíquota interna da UF de destino (%) — base do DIFAL. */
    aliqInternaDestino?: number | string;
    origem?: string;
  }>;
}

/** Normaliza o texto livre do regime da empresa para o enum do motor. */
export function normalizarRegime(regime?: string): RegimeTributario {
  const v = (regime ?? '').toUpperCase();
  if (v.includes('SIMPLES')) return 'SIMPLES';
  if (v.includes('REAL')) return 'REAL';
  return 'PRESUMIDO';
}

/**
 * Converte o formulário da tela de NF-e nas entradas do motor (cabeçalho + linhas)
 * e nos campos extras de persistência do destinatário. Substitui o caminho
 * `createNfe`/`buildNfePayload` (que estimava o ICMS por heurística `subtotal×aliq/100`
 * e ignorava IBS/CBS/PIS/COFINS/IPI). O perfil tributário da linha vem dos campos
 * digitados; ao vincular o item a um produto (P1) passará a vir de
 * `resolverConfigTributaria(produto)`.
 */
export function montarEmissaoNfe(
  form: NfeFormValue,
  empresa: EmpresaEmitente,
  regras: RegraTributariaDoc[] = [],
): {
  cab: CabecalhoNota;
  linhas: LinhaEmissao[];
  extras: Record<string, unknown>;
} {
  const regime = normalizarRegime(empresa.regimeTributario);
  const dest = form.destinatario ?? {};
  const cab: CabecalhoNota = {
    regime,
    tipoOperacao: form.tipo === 'ENTRADA' ? 'ENTRADA' : 'SAIDA',
    ufEmitente: (empresa.uf ?? '').toUpperCase(),
    ufDestino: (dest.uf ?? '').toUpperCase(),
    consumidorFinal: !!form.consumidorFinal,
    contribuinteIcms: !!String(dest.inscricaoEstadual ?? '').trim(),
  };
  const linhas: LinhaEmissao[] = (form.itens ?? []).map(it => {
    const origem = it.origem ?? '0';
    const aliqIcms = num(it.aliquotaIcms);
    const aliqInternaDestino = num(it.aliqInternaDestino);  // base do DIFAL
    // Simples → o motor tributa via CSOSN; demais regimes → via CST.
    const linhaConfig: ConfigTributariaItem = regime === 'SIMPLES'
      ? { origem, csosn: it.csosn ?? it.cstIcms ?? '102', aliqIcms, aliqInternaDestino }
      : { origem, cstIcms: it.cstIcms ?? '00', aliqIcms, aliqInternaDestino };
    // P1.5: regra tributária aplicável (NCM/CFOP/UF/regime, na vigência) sobrepõe a config digitada.
    const regra = regras.length ? selecionarRegra(regras, {
      ncm: it.ncm, cfop: it.cfop, ufOrigem: cab.ufEmitente, ufDestino: cab.ufDestino,
      tipoOperacao: cab.tipoOperacao, regime,
    }) : null;
    const config = regra ? mesclarRegraNaConfig(linhaConfig, regra) : linhaConfig;
    return {
      descricao: it.descricao,
      ncm: it.ncm,
      cfop: it.cfop,
      quantidade: num(it.quantidade) ?? 0,
      valorUnitario: num(it.valorUnitario) ?? 0,
      config,
    };
  });
  // Apenas colunas já existentes em `notas_fiscais` (mesmas usadas por buildNfePayload).
  const extras: Record<string, unknown> = {
    naturezaOperacao: form.naturezaOperacao ?? '',
    destinatarioNome: dest.razaoSocial ?? '',
    destinatarioCpfCnpj: dest.cnpjCpf ?? '',
  };
  return { cab, linhas, extras };
}
