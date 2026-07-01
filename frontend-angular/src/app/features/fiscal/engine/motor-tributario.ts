/**
 * Motor de cálculo tributário (Bear ERP — módulo Fiscal).
 *
 * Módulo PURO (sem dependência de Angular): calcula os tributos incidentes
 * sobre um item de documento fiscal segundo a legislação brasileira. É usado
 * tanto na emissão no front (NF-e/NFС-e/NFS-e) quanto nas Appwrite Functions
 * de transmissão à SEFAZ (Fase 6) e na apuração/SPED (Fases 3-5).
 *
 * Cobertura:
 *  - ICMS regime normal (CST 00/10/20/40/41/51/60/70/90) e Simples (CSOSN)
 *  - ICMS-ST por MVA (margem de valor agregado)
 *  - IPI
 *  - PIS/COFINS cumulativo (Presumido) e não-cumulativo (Real)
 *  - DIFAL — partilha consumidor final não contribuinte (EC 87/2015, 100% destino)
 *  - FCP / FCP-ST (Fundo de Combate à Pobreza)
 *  - ISS (serviços)
 *
 * Todos os valores monetários são arredondados a 2 casas (padrão SEFAZ/SPED).
 */

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────

export type RegimeTributario = 'SIMPLES' | 'PRESUMIDO' | 'REAL';
export type TipoOperacao = 'ENTRADA' | 'SAIDA';

/** Contexto da operação (cabeçalho do documento). */
export interface ContextoFiscal {
  regime: RegimeTributario;
  operacao: TipoOperacao;
  /** UF do emitente (ex.: 'SP'). */
  ufOrigem: string;
  /** UF do destinatário (ex.: 'RJ'). */
  ufDestino: string;
  /** Operação destinada a consumidor final. */
  consumidorFinal: boolean;
  /** Destinatário é contribuinte do ICMS. */
  contribuinteIcms: boolean;
}

/** Configuração tributária aplicável ao item (vem do cadastro do produto + regra por UF). */
export interface ConfigTributariaItem {
  /** Origem da mercadoria (0-8 da tabela da NF-e). */
  origem: string;

  // ICMS próprio
  /** CST do ICMS (regime normal): '00','10','20','40','41','51','60','70','90'. */
  cstIcms?: string;
  /** CSOSN (Simples Nacional): '101','102','201','202','500','900', etc. */
  csosn?: string;
  /** Alíquota de ICMS própria (%). Quando ausente, é derivada da operação. */
  aliqIcms?: number;
  /** Percentual de redução da base de cálculo do ICMS (%). */
  redBcIcms?: number;

  // ICMS-ST
  /** Margem de Valor Agregado (%) para substituição tributária. */
  mva?: number;
  /** Alíquota interna do ICMS na UF de destino (%) — base do ST. */
  aliqIcmsSt?: number;
  /** Redução de base do ICMS-ST (%). */
  redBcIcmsSt?: number;

  // FCP
  /** Alíquota do Fundo de Combate à Pobreza sobre operação própria (%). */
  aliqFcp?: number;
  /** Alíquota do FCP retido por ST (%). */
  aliqFcpSt?: number;

  // Interestadual / DIFAL
  /** Alíquota interestadual (%) — 4/7/12. Derivada quando ausente. */
  aliqInterestadual?: number;
  /** Alíquota interna da UF de destino (%) — usada no DIFAL. */
  aliqInternaDestino?: number;

  // IPI
  /** CST do IPI. */
  cstIpi?: string;
  /** Alíquota do IPI (%). */
  aliqIpi?: number;

  // PIS/COFINS
  cstPis?: string;
  cstCofins?: string;
  /** Alíquota de PIS (%). Quando ausente, derivada do regime. */
  aliqPis?: number;
  /** Alíquota de COFINS (%). Quando ausente, derivada do regime. */
  aliqCofins?: number;

  // ISS (serviços)
  /** Alíquota do ISS (%) — apenas para itens de serviço. */
  aliqIss?: number;

  /** Alíquota de crédito de ICMS no Simples (CSOSN 101), informada no XML. */
  aliqCreditoSimples?: number;

  // IBS/CBS + Imposto Seletivo (Reforma Tributária — NT 2025.002)
  /** CST do IBS/CBS (3 díg). */
  cstIbsCbs?: string;
  /** Código de Classificação Tributária do IBS/CBS (6 díg). */
  cClassTrib?: string;
  /** Alíquota do IBS estadual (%). Default: fase-teste 2026. */
  aliqIbsUf?: number;
  /** Alíquota do IBS municipal (%). Default: fase-teste 2026. */
  aliqIbsMun?: number;
  /** Alíquota da CBS (%). Default: fase-teste 2026. */
  aliqCbs?: number;
  /** CST do Imposto Seletivo. */
  cstIs?: string;
  /** Alíquota do Imposto Seletivo (%). */
  aliqIs?: number;
}

/** Item a calcular. */
export interface ItemFiscal {
  descricao?: string;
  ncm?: string;
  cfop?: string;
  quantidade: number;
  valorUnitario: number;
  /** Desconto incondicional do item. */
  desconto?: number;
  frete?: number;
  seguro?: number;
  /** Outras despesas acessórias. */
  outras?: number;
  /** Indica item de serviço (incide ISS, não ICMS). */
  servico?: boolean;
  config: ConfigTributariaItem;
}

/** Resultado do cálculo de um item. */
export interface ResultadoItem {
  /** Valor bruto dos produtos (qtd × unitário). */
  valorProdutos: number;

  // ICMS
  baseIcms: number;
  aliqIcms: number;
  valorIcms: number;
  valorIcmsDesonerado: number;

  // ICMS-ST
  baseIcmsSt: number;
  valorIcmsSt: number;

  // FCP
  valorFcp: number;
  valorFcpSt: number;

  // DIFAL (consumidor final não contribuinte)
  baseDifal: number;
  valorDifalDestino: number;
  valorDifalOrigem: number;

  // IPI
  baseIpi: number;
  aliqIpi: number;
  valorIpi: number;

  // PIS/COFINS
  basePisCofins: number;
  valorPis: number;
  valorCofins: number;

  // ISS
  baseIss: number;
  valorIss: number;

  // IBS/CBS + Imposto Seletivo (Reforma Tributária — NT 2025.002)
  baseIbsCbs: number;
  valorIbsUf: number;
  valorIbsMun: number;
  valorIbs: number;
  valorCbs: number;
  baseIs: number;
  valorIs: number;

  // Simples
  valorCreditoSimples: number;

  /** Total do item já com IPI e ICMS-ST somados ao valor dos produtos. */
  valorTotalItem: number;
}

/** Totais consolidados do documento. */
export interface TotaisDocumento {
  valorProdutos: number;
  baseIcms: number;
  valorIcms: number;
  baseIcmsSt: number;
  valorIcmsSt: number;
  valorFcp: number;
  valorFcpSt: number;
  valorDifalDestino: number;
  valorDifalOrigem: number;
  valorIpi: number;
  valorPis: number;
  valorCofins: number;
  valorIss: number;
  // IBS/CBS + Imposto Seletivo (Reforma) — informativos, NÃO compõem valorTotalNota
  baseIbsCbs: number;
  valorIbs: number;
  valorCbs: number;
  valorIs: number;
  valorIcmsDesonerado: number;
  valorDesconto: number;
  valorFrete: number;
  valorSeguro: number;
  valorOutras: number;
  valorCreditoSimples: number;
  /** Valor total da nota. */
  valorTotalNota: number;
}

/**
 * Alíquotas da fase-teste da Reforma Tributária em 2026 (IBS 0,1% + CBS 0,9% = 1%).
 * Valores informativos no DF-e; NÃO compõem o vNF/VL_DOC (modo híbrido / SPED Layout 020).
 * Parametrizáveis por item (config) — versionar por vigência ao ligar `regras_tributarias` (P1.5).
 *
 * ⚠️ PROVISÓRIO: o split do IBS entre UF (0,1) e Município (0,0) é um PALPITE. Confirmar
 * contra a tabela oficial (Portal Nacional NF-e → Esquemas XML ~v1.36 + Tabela cClassTrib)
 * junto da Parte B (serialização do XML), que se valida na homologação SEFAZ. O total (1%)
 * é o que importa enquanto o XML não é emitido.
 */
export const ALIQUOTAS_REFORMA_2026 = { ibsUf: 0.1, ibsMun: 0.0, cbs: 0.9, is: 0.0 } as const;

// ────────────────────────────────────────────────────────────
// Constantes de UF / regiões (para alíquota interestadual)
// ────────────────────────────────────────────────────────────

/** Estados das regiões Sul/Sudeste (exceto ES) — origem que aplica 7% p/ N/NE/CO/ES. */
const SUL_SUDESTE = new Set(['SP', 'RJ', 'MG', 'PR', 'RS', 'SC']);

/** Origens consideradas mercadoria importada → alíquota interestadual de 4%. */
const ORIGEM_IMPORTADA = new Set(['1', '2', '3', '8']);

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Arredonda a 2 casas decimais (meio-para-cima), padrão dos campos de valor da SEFAZ. */
export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

const pct = (v: number | undefined): number => (v ?? 0) / 100;

/**
 * Determina a alíquota interestadual aplicável.
 * - 4% para mercadoria importada (Resolução SF 13/2012);
 * - 7% de Sul/Sudeste (exceto ES) para Norte/Nordeste/Centro-Oeste/ES;
 * - 12% nos demais casos interestaduais.
 */
export function aliquotaInterestadual(ufOrigem: string, ufDestino: string, origem: string): number {
  if (ufOrigem === ufDestino) return 0;
  if (ORIGEM_IMPORTADA.has(origem)) return 4;
  if (SUL_SUDESTE.has(ufOrigem) && !SUL_SUDESTE.has(ufDestino)) return 7;
  return 12;
}

/** CSTs de ICMS que efetivamente tributam (têm base + alíquota próprias). */
const CST_ICMS_TRIBUTADO = new Set(['00', '10', '20', '51', '70', '90']);
/** CSTs de ICMS que envolvem substituição tributária. */
const CST_ICMS_COM_ST = new Set(['10', '30', '70']);
/** CSOSN do Simples que permitem crédito de ICMS ao destinatário. */
const CSOSN_COM_CREDITO = new Set(['101', '201']);
/** CSOSN do Simples com cobrança de ICMS-ST. */
const CSOSN_COM_ST = new Set(['201', '202', '203', '900']);

// ────────────────────────────────────────────────────────────
// Cálculo por item
// ────────────────────────────────────────────────────────────

/** Base de partida do item: produtos + frete + seguro + outras − desconto. */
function baseBruta(item: ItemFiscal): { valorProdutos: number; base: number } {
  const valorProdutos = round2(item.quantidade * item.valorUnitario);
  const base = round2(
    valorProdutos +
      (item.frete ?? 0) +
      (item.seguro ?? 0) +
      (item.outras ?? 0) -
      (item.desconto ?? 0),
  );
  return { valorProdutos, base };
}

/** Calcula o IPI do item. */
/**
 * IBS/CBS + Imposto Seletivo (Reforma — NT 2025.002). Cálculo puro: valor = base × alíquota.
 * Default = alíquotas da fase-teste 2026 (config sobrepõe por item). IS só quando alíquota > 0.
 * ⚠️ tratamento do Simples Nacional sob a reforma é decisão de config (alíquota/cClassTrib),
 *    não está chumbado aqui — ver P1.5 (`regras_tributarias` por vigência).
 */
function calcularIbsCbs(cfg: ConfigTributariaItem, base: number): {
  baseIbsCbs: number; valorIbsUf: number; valorIbsMun: number; valorIbs: number;
  valorCbs: number; baseIs: number; valorIs: number;
} {
  const valorIbsUf = round2(base * pct(cfg.aliqIbsUf ?? ALIQUOTAS_REFORMA_2026.ibsUf));
  const valorIbsMun = round2(base * pct(cfg.aliqIbsMun ?? ALIQUOTAS_REFORMA_2026.ibsMun));
  const valorCbs = round2(base * pct(cfg.aliqCbs ?? ALIQUOTAS_REFORMA_2026.cbs));
  const valorIs = round2(base * pct(cfg.aliqIs ?? ALIQUOTAS_REFORMA_2026.is));
  return {
    baseIbsCbs: base, valorIbsUf, valorIbsMun, valorIbs: round2(valorIbsUf + valorIbsMun),
    valorCbs, baseIs: valorIs > 0 ? base : 0, valorIs,
  };
}

function calcularIpi(item: ItemFiscal, base: number): { baseIpi: number; aliqIpi: number; valorIpi: number } {
  const aliqIpi = item.config.aliqIpi ?? 0;
  if (aliqIpi <= 0) return { baseIpi: 0, aliqIpi: 0, valorIpi: 0 };
  return { baseIpi: base, aliqIpi, valorIpi: round2(base * pct(aliqIpi)) };
}

/** Calcula PIS e COFINS, derivando alíquotas do regime quando não informadas. */
function calcularPisCofins(
  ctx: ContextoFiscal,
  cfg: ConfigTributariaItem,
  base: number,
): { valorPis: number; valorCofins: number } {
  // Não-cumulativo (Lucro Real): 1,65% / 7,6%. Cumulativo (Presumido): 0,65% / 3%.
  const naoCumulativo = ctx.regime === 'REAL';
  const aliqPis = cfg.aliqPis ?? (naoCumulativo ? 1.65 : 0.65);
  const aliqCofins = cfg.aliqCofins ?? (naoCumulativo ? 7.6 : 3.0);
  // No Simples Nacional, PIS/COFINS estão no DAS — não se destacam na nota.
  if (ctx.regime === 'SIMPLES') return { valorPis: 0, valorCofins: 0 };
  return {
    valorPis: round2(base * pct(aliqPis)),
    valorCofins: round2(base * pct(aliqCofins)),
  };
}

/** Calcula ICMS-ST por MVA. Retorna base, ICMS-ST e FCP-ST. */
function calcularIcmsSt(
  cfg: ConfigTributariaItem,
  baseProdutoComIpi: number,
  valorIcmsProprio: number,
): { baseIcmsSt: number; valorIcmsSt: number; valorFcpSt: number } {
  const mva = cfg.mva ?? 0;
  const aliqSt = cfg.aliqIcmsSt ?? cfg.aliqInternaDestino ?? 0;
  if (mva <= 0 || aliqSt <= 0) return { baseIcmsSt: 0, valorIcmsSt: 0, valorFcpSt: 0 };
  let baseSt = baseProdutoComIpi * (1 + pct(mva));
  if (cfg.redBcIcmsSt) baseSt *= 1 - pct(cfg.redBcIcmsSt);
  baseSt = round2(baseSt);
  const icmsSt = round2(baseSt * pct(aliqSt) - valorIcmsProprio);
  const valorFcpSt = cfg.aliqFcpSt ? round2(baseSt * pct(cfg.aliqFcpSt)) : 0;
  return { baseIcmsSt: baseSt, valorIcmsSt: Math.max(icmsSt, 0), valorFcpSt };
}

/** Calcula o DIFAL (EC 87/2015) — venda interestadual a consumidor final não contribuinte. */
function calcularDifal(
  ctx: ContextoFiscal,
  cfg: ConfigTributariaItem,
  base: number,
): { baseDifal: number; valorDifalDestino: number; valorDifalOrigem: number; valorFcp: number } {
  const interestadual = ctx.ufOrigem !== ctx.ufDestino;
  const aplica = ctx.operacao === 'SAIDA' && interestadual && ctx.consumidorFinal && !ctx.contribuinteIcms;
  if (!aplica) return { baseDifal: 0, valorDifalDestino: 0, valorDifalOrigem: 0, valorFcp: 0 };

  const aliqInter = cfg.aliqInterestadual ?? aliquotaInterestadual(ctx.ufOrigem, ctx.ufDestino, cfg.origem);
  const aliqInterna = cfg.aliqInternaDestino ?? cfg.aliqIcmsSt ?? 0;
  const diferenca = Math.max(aliqInterna - aliqInter, 0);
  // Desde 2019 o DIFAL é 100% para a UF de destino (fim da partilha).
  const valorDifalDestino = round2(base * pct(diferenca));
  const valorFcp = cfg.aliqFcp ? round2(base * pct(cfg.aliqFcp)) : 0;
  return { baseDifal: base, valorDifalDestino, valorDifalOrigem: 0, valorFcp };
}

/**
 * Calcula todos os tributos de um item.
 */
export function calcularItem(ctx: ContextoFiscal, item: ItemFiscal): ResultadoItem {
  const { valorProdutos, base } = baseBruta(item);
  const ibsCbs = calcularIbsCbs(item.config, base);

  const vazio: ResultadoItem = {
    valorProdutos,
    baseIcms: 0, aliqIcms: 0, valorIcms: 0, valorIcmsDesonerado: 0,
    baseIcmsSt: 0, valorIcmsSt: 0,
    valorFcp: 0, valorFcpSt: 0,
    baseDifal: 0, valorDifalDestino: 0, valorDifalOrigem: 0,
    baseIpi: 0, aliqIpi: 0, valorIpi: 0,
    basePisCofins: base, valorPis: 0, valorCofins: 0,
    baseIss: 0, valorIss: 0,
    baseIbsCbs: 0, valorIbsUf: 0, valorIbsMun: 0, valorIbs: 0, valorCbs: 0, baseIs: 0, valorIs: 0,
    valorCreditoSimples: 0,
    valorTotalItem: valorProdutos,
  };

  // ── Serviço: incide ISS, não ICMS/IPI ──────────────────────
  if (item.servico) {
    const valorIss = round2(base * pct(item.config.aliqIss));
    const { valorPis, valorCofins } = calcularPisCofins(ctx, item.config, base);
    return { ...vazio, ...ibsCbs, baseIss: base, valorIss, valorPis, valorCofins };
  }

  const { baseIpi, aliqIpi, valorIpi } = calcularIpi(item, base);
  const { valorPis, valorCofins } = calcularPisCofins(ctx, item.config, base);

  // ── Simples Nacional: ICMS via CSOSN ───────────────────────
  if (ctx.regime === 'SIMPLES') {
    const csosn = item.config.csosn ?? '102';
    let valorCreditoSimples = 0;
    if (CSOSN_COM_CREDITO.has(csosn) && item.config.aliqCreditoSimples) {
      valorCreditoSimples = round2(valorProdutos * pct(item.config.aliqCreditoSimples));
    }
    let st = { baseIcmsSt: 0, valorIcmsSt: 0, valorFcpSt: 0 };
    if (CSOSN_COM_ST.has(csosn)) {
      st = calcularIcmsSt(item.config, round2(base + valorIpi), 0);
    }
    return {
      ...vazio,
      ...ibsCbs,
      baseIpi, aliqIpi, valorIpi,
      valorPis, valorCofins,
      baseIcmsSt: st.baseIcmsSt, valorIcmsSt: st.valorIcmsSt, valorFcpSt: st.valorFcpSt,
      valorCreditoSimples,
      valorTotalItem: round2(valorProdutos + valorIpi + st.valorIcmsSt + st.valorFcpSt
        - (item.desconto ?? 0) + (item.frete ?? 0) + (item.seguro ?? 0) + (item.outras ?? 0)),
    };
  }

  // ── Regime normal (Presumido/Real): ICMS via CST ───────────
  const cst = item.config.cstIcms ?? '00';
  const interestadual = ctx.ufOrigem !== ctx.ufDestino;

  let aliqIcms = item.config.aliqIcms ?? 0;
  if (interestadual) {
    // Operação interestadual: o ICMS próprio destaca-se pela alíquota interestadual
    // (4/7/12). A diferença até a alíquota interna do destino é recolhida via DIFAL.
    aliqIcms = item.config.aliqInterestadual ?? aliquotaInterestadual(ctx.ufOrigem, ctx.ufDestino, item.config.origem);
  }

  let baseIcms = 0;
  let valorIcms = 0;
  let valorIcmsDesonerado = 0;

  if (CST_ICMS_TRIBUTADO.has(cst)) {
    baseIcms = item.config.redBcIcms ? round2(base * (1 - pct(item.config.redBcIcms))) : base;
    valorIcms = round2(baseIcms * pct(aliqIcms));
  } else if (cst === '40' || cst === '41' || cst === '50') {
    // Isenta / não tributada / suspensão → ICMS desonerado quando houver alíquota de referência.
    valorIcmsDesonerado = round2(base * pct(item.config.aliqIcms));
  }
  // CST 60: ICMS já retido por ST anteriormente → sem ICMS próprio nesta operação.

  const valorFcpProprio = (CST_ICMS_TRIBUTADO.has(cst) && item.config.aliqFcp && !interestadual)
    ? round2(baseIcms * pct(item.config.aliqFcp))
    : 0;

  // ICMS-ST quando o CST indica (10/70) ou houver MVA configurado.
  let st = { baseIcmsSt: 0, valorIcmsSt: 0, valorFcpSt: 0 };
  if (CST_ICMS_COM_ST.has(cst) || item.config.mva) {
    st = calcularIcmsSt(item.config, round2(base + valorIpi), valorIcms);
  }

  const difal = calcularDifal(ctx, item.config, base);

  const valorTotalItem = round2(
    valorProdutos + valorIpi + st.valorIcmsSt + st.valorFcpSt
      - (item.desconto ?? 0) + (item.frete ?? 0) + (item.seguro ?? 0) + (item.outras ?? 0)
      - valorIcmsDesonerado,
  );

  return {
    valorProdutos,
    baseIcms, aliqIcms, valorIcms, valorIcmsDesonerado,
    baseIcmsSt: st.baseIcmsSt, valorIcmsSt: st.valorIcmsSt,
    valorFcp: valorFcpProprio + difal.valorFcp, valorFcpSt: st.valorFcpSt,
    baseDifal: difal.baseDifal, valorDifalDestino: difal.valorDifalDestino, valorDifalOrigem: difal.valorDifalOrigem,
    baseIpi, aliqIpi, valorIpi,
    basePisCofins: base, valorPis, valorCofins,
    baseIss: 0, valorIss: 0,
    ...ibsCbs,
    valorCreditoSimples: 0,
    valorTotalItem,
  };
}

// ────────────────────────────────────────────────────────────
// Consolidação do documento
// ────────────────────────────────────────────────────────────

/** Calcula todos os itens e consolida os totais do documento fiscal. */
export function calcularDocumento(
  ctx: ContextoFiscal,
  itens: ItemFiscal[],
): { itens: ResultadoItem[]; totais: TotaisDocumento } {
  const resultados = itens.map(item => calcularItem(ctx, item));

  const soma = (sel: (r: ResultadoItem) => number) => round2(resultados.reduce((s, r) => s + sel(r), 0));
  const somaItem = (sel: (i: ItemFiscal) => number) => round2(itens.reduce((s, i) => s + sel(i), 0));

  const valorProdutos = soma(r => r.valorProdutos);
  const valorIpi = soma(r => r.valorIpi);
  const valorIcmsSt = soma(r => r.valorIcmsSt);
  const valorFcpSt = soma(r => r.valorFcpSt);
  const valorDesconto = somaItem(i => i.desconto ?? 0);
  const valorFrete = somaItem(i => i.frete ?? 0);
  const valorSeguro = somaItem(i => i.seguro ?? 0);
  const valorOutras = somaItem(i => i.outras ?? 0);
  const valorIcmsDesonerado = soma(r => r.valorIcmsDesonerado);
  const valorIss = soma(r => r.valorIss);

  // vNF = produtos + IPI + ST + frete + seguro + outras − desconto − ICMS desonerado + ISS.
  const valorTotalNota = round2(
    valorProdutos + valorIpi + valorIcmsSt + valorFcpSt + valorFrete + valorSeguro + valorOutras
      - valorDesconto - valorIcmsDesonerado + valorIss,
  );

  const totais: TotaisDocumento = {
    valorProdutos,
    baseIcms: soma(r => r.baseIcms),
    valorIcms: soma(r => r.valorIcms),
    baseIcmsSt: soma(r => r.baseIcmsSt),
    valorIcmsSt,
    valorFcp: soma(r => r.valorFcp),
    valorFcpSt,
    valorDifalDestino: soma(r => r.valorDifalDestino),
    valorDifalOrigem: soma(r => r.valorDifalOrigem),
    valorIpi,
    valorPis: soma(r => r.valorPis),
    valorCofins: soma(r => r.valorCofins),
    valorIss,
    baseIbsCbs: soma(r => r.baseIbsCbs),
    valorIbs: soma(r => r.valorIbs),
    valorCbs: soma(r => r.valorCbs),
    valorIs: soma(r => r.valorIs),
    valorIcmsDesonerado,
    valorDesconto,
    valorFrete,
    valorSeguro,
    valorOutras,
    valorCreditoSimples: soma(r => r.valorCreditoSimples),
    valorTotalNota,
  };

  return { itens: resultados, totais };
}
