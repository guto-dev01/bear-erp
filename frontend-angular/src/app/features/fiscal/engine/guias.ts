/**
 * Guias de arrecadação (DARF/GNRE/GARE) — módulo PURO.
 *
 * Cobre as partes calculáveis offline de uma guia:
 *  - acréscimos por atraso: multa de mora (0,33%/dia, teto 20%) + juros
 *    (SELIC acumulada informada, ou 1% a.m. como aproximação);
 *  - código de barras FEBRABAN de arrecadação (44 dígitos, com DV geral) e a
 *    linha digitável (48 dígitos = 4 blocos de 11 + DV módulo 10 por bloco).
 *
 * Caveat: o código de barras tem a MATEMÁTICA correta (DVs), mas um código
 * realmente escaneável depende dos códigos de órgão/convênio de cada tributo
 * (não disponíveis no cadastro atual) — aqui o campo de identificação é
 * preenchido com competência/valor como placeholder.
 *
 * Sem dependência de Angular nem de runtime externo: roda no front e em Node.
 */

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function pad(v: string | number, len: number): string {
  return String(v).replace(/\D/g, '').padStart(len, '0').slice(-len);
}

/** Dias desde a época (UTC) de uma data 'YYYY-MM-DD'. */
function emDias(s: string): number {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}

/** Diferença em dias entre duas datas 'YYYY-MM-DD' (b − a). */
export function diasEntre(a: string, b: string): number {
  return emDias(b) - emDias(a);
}

// ────────────────────────────────────────────────────────────
// Dígitos verificadores (FEBRABAN arrecadação)
// ────────────────────────────────────────────────────────────

/** Módulo 10 (FEBRABAN): pesos 2,1 da direita p/ esquerda; produto>9 soma os dígitos. */
export function dvModulo10(num: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    let p = parseInt(num[i], 10) * peso;
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    soma += p;
    peso = peso === 2 ? 1 : 2;
  }
  const dv = 10 - (soma % 10);
  return dv === 10 ? 0 : dv;
}

/** Módulo 11 (FEBRABAN arrecadação): pesos 2..9; DV 0/10/11 → 0. */
export function dvModulo11(num: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    soma += parseInt(num[i], 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  return dv === 0 || dv === 10 || dv === 11 ? 0 : dv;
}

/** DV conforme o identificador de valor (6/8 → módulo 10; 7/9 → módulo 11). */
function dvPorId(num: string, idValor: string): number {
  return idValor === '7' || idValor === '9' ? dvModulo11(num) : dvModulo10(num);
}

// ────────────────────────────────────────────────────────────
// Código de barras + linha digitável
// ────────────────────────────────────────────────────────────

export interface CodigoBarrasParams {
  /** Segmento (1 prefeituras, … 7 tributos, 9 outros). */
  segmento: string;
  /** Valor da guia em reais. */
  valor: number;
  /** Campo de identificação/órgão + livre (até 29 dígitos). */
  identificacao: string;
  /** 6 valor efetivo (mód.10, padrão), 7 (mód.11), 8/9 quantidade de moeda. */
  idValor?: string;
}

/** Gera o código de barras de arrecadação (44 dígitos) com o DV geral. */
export function gerarCodigoBarras(p: CodigoBarrasParams): string {
  const produto = '8';
  const idValor = p.idValor ?? '6';
  const valorCent = pad(Math.round(p.valor * 100), 11);
  const livre = pad(p.identificacao, 29);
  // 43 dígitos (sem o DV geral, que ocupa a 4ª posição).
  const semDv = produto + p.segmento + idValor + valorCent + livre;
  const dv = dvPorId(semDv, idValor);
  return produto + p.segmento + idValor + String(dv) + valorCent + livre;
}

/** Linha digitável (48 dígitos): 4 blocos de 11 do código de barras + DV módulo 10. */
export function linhaDigitavel(codigoBarras: string): string {
  const blocos: string[] = [];
  for (let i = 0; i < 4; i++) {
    const bloco = codigoBarras.slice(i * 11, i * 11 + 11);
    blocos.push(bloco + String(dvModulo10(bloco)));
  }
  return blocos.join('');
}

/** Formata a linha digitável agrupada para exibição (4 campos). */
export function formatarLinhaDigitavel(linha: string): string {
  return [linha.slice(0, 12), linha.slice(12, 24), linha.slice(24, 36), linha.slice(36, 48)].join(' ');
}

// ────────────────────────────────────────────────────────────
// Acréscimos por atraso
// ────────────────────────────────────────────────────────────

export interface Acrescimos {
  diasAtraso: number;
  multaPercentual: number;
  multa: number;
  jurosPercentual: number;
  juros: number;
  valorTotal: number;
}

/**
 * Calcula multa e juros de mora de uma guia paga em atraso.
 *  - Multa de mora: 0,33% por dia de atraso, limitada a 20%;
 *  - Juros: SELIC acumulada (%) quando informada; senão 1% por mês iniciado.
 * Sem atraso (pagamento ≤ vencimento) → acréscimos zerados.
 */
export function calcularAcrescimos(
  valorPrincipal: number,
  vencimento: string,
  pagamento: string,
  opts: { selicAcumulada?: number } = {},
): Acrescimos {
  const dias = diasEntre(vencimento, pagamento);
  if (dias <= 0) {
    return { diasAtraso: 0, multaPercentual: 0, multa: 0, jurosPercentual: 0, juros: 0, valorTotal: round2(valorPrincipal) };
  }
  const multaPercentual = Math.min(round2(0.33 * dias), 20);
  const multa = round2(valorPrincipal * (multaPercentual / 100));
  const mesesAtraso = Math.ceil(dias / 30);
  const jurosPercentual = opts.selicAcumulada !== undefined ? round2(opts.selicAcumulada) : mesesAtraso; // 1% a.m.
  const juros = round2(valorPrincipal * (jurosPercentual / 100));
  return {
    diasAtraso: dias,
    multaPercentual,
    multa,
    jurosPercentual,
    juros,
    valorTotal: round2(valorPrincipal + multa + juros),
  };
}

// ────────────────────────────────────────────────────────────
// Montagem da guia
// ────────────────────────────────────────────────────────────

/** Segmento FEBRABAN por tipo de guia (placeholder por tributo). */
const SEGMENTO_POR_TIPO: Record<string, string> = {
  DARF: '7', GNRE: '7', GARE: '7', DAS: '7', GPS: '7', DAE: '7',
};

export interface GuiaCalculada extends Acrescimos {
  tipo: string;
  competencia: string;
  valorPrincipal: number;
  vencimento: string;
  pagamento?: string;
  codigoBarras: string;
  linhaDigitavel: string;
  linhaDigitavelFormatada: string;
}

/**
 * Monta a guia "calculada": acréscimos (se houver data de pagamento) + código de
 * barras e linha digitável a partir do valor total.
 */
export function montarGuia(params: {
  tipo: string;
  competencia: string;
  valorPrincipal: number;
  vencimento: string;
  pagamento?: string;
  selicAcumulada?: number;
}): GuiaCalculada {
  const acr = params.pagamento
    ? calcularAcrescimos(params.valorPrincipal, params.vencimento, params.pagamento, { selicAcumulada: params.selicAcumulada })
    : { diasAtraso: 0, multaPercentual: 0, multa: 0, jurosPercentual: 0, juros: 0, valorTotal: round2(params.valorPrincipal) };

  const segmento = SEGMENTO_POR_TIPO[params.tipo] ?? '9';
  // Campo de identificação (placeholder): competência (AAAAMM) + sufixo do tipo.
  const identificacao = params.competencia.replace('-', '') + pad(params.tipo.length, 4);
  const codigoBarras = gerarCodigoBarras({ segmento, valor: acr.valorTotal, identificacao, idValor: '6' });
  const linha = linhaDigitavel(codigoBarras);

  return {
    ...acr,
    tipo: params.tipo,
    competencia: params.competencia,
    valorPrincipal: round2(params.valorPrincipal),
    vencimento: params.vencimento,
    pagamento: params.pagamento,
    codigoBarras,
    linhaDigitavel: linha,
    linhaDigitavelFormatada: formatarLinhaDigitavel(linha),
  };
}
