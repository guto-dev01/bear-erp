/**
 * Geração de arquivos SPED — EFD ICMS/IPI (SPED Fiscal) e EFD-Contribuições.
 * Módulo PURO (sem Angular): monta o arquivo de texto no layout oficial
 * (registros delimitados por "|", um por linha, hierarquia em blocos).
 *
 * Cobertura nesta fase:
 *  - EFD ICMS/IPI: Bloco 0 (0000/0001/0005/0150/0190/0200/0990),
 *    Bloco C (C001/C100/C170/C190/C990), Bloco E (E001/E100/E110/E500/E510/
 *    E520/E990), Bloco 1 (1001/1010/1990) e Bloco 9 (9001/9900/9990/9999).
 *  - EFD-Contribuições: Bloco 0 (0000/0001/0110/0990), Bloco M consolidado
 *    (M001/M200/M600/M990) e Bloco 9. O detalhamento por documento (Bloco C/A)
 *    da EFD-Contribuições fica para evolução futura.
 *
 * A parte crítica — e a mais sujeita a rejeição — são os contadores do Bloco 9
 * (9900 por registro, 9990 por bloco, 9999 total do arquivo); são calculados
 * de forma consistente e cobertos por teste.
 *
 * Referências de layout: Guia Prático EFD ICMS/IPI e EFD-Contribuições (Sped).
 */

import type { RegimeFederal } from './apuracao-federal';

// ────────────────────────────────────────────────────────────
// Formatadores de campo
// ────────────────────────────────────────────────────────────

/** Data 'YYYY-MM-DD' → 'ddmmaaaa' (vazio se ausente). */
function dt(s: string | undefined): string {
  if (!s || s.length < 10) return '';
  return s.slice(8, 10) + s.slice(5, 7) + s.slice(0, 4);
}

/** Valor monetário/numérico → string com vírgula decimal e N casas (2 por padrão). */
function vl(n: number | undefined, casas = 2): string {
  const v = typeof n === 'number' && !isNaN(n) ? n : 0;
  return v.toFixed(casas).replace('.', ',');
}

/** Texto: undefined/null → vazio; remove "|" e quebras de linha (delimitadores). */
function tx(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[|\r\n]/g, ' ').trim();
}

// ────────────────────────────────────────────────────────────
// Builder de registros + contadores do Bloco 9
// ────────────────────────────────────────────────────────────

/** Acumula linhas de registro e a contagem por tipo, e fecha o Bloco 9. */
export class SpedBuilder {
  private linhas: string[] = [];
  private contagem = new Map<string, number>();

  /** Adiciona um registro `|REG|campo1|...|`, contabilizando-o. */
  add(reg: string, campos: Array<string | number | undefined>): void {
    const corpo = campos.map(c => (typeof c === 'number' ? vl(c) : c ?? '')).join('|');
    this.linhas.push(`|${reg}|${corpo}|`);
    this.contagem.set(reg, (this.contagem.get(reg) ?? 0) + 1);
  }

  /** Adiciona um registro com campos já formatados (sem coerção numérica). */
  addRaw(reg: string, campos: string[]): void {
    this.linhas.push(`|${reg}|${campos.join('|')}|`);
    this.contagem.set(reg, (this.contagem.get(reg) ?? 0) + 1);
  }

  /** Quantas linhas há de um registro (para os totalizadores X990). */
  count(reg: string): number {
    return this.contagem.get(reg) ?? 0;
  }

  /**
   * Fecha o arquivo: emite o Bloco 9 (9001, 9900 por registro, 9990, 9999) com
   * os contadores consistentes e devolve o texto final (linhas separadas por CRLF).
   */
  finalizar(): string {
    // 9001 entra na contagem antes de calcular o conjunto de registros do 9900.
    this.linhas.push('|9001|0|');
    this.contagem.set('9001', 1);

    const regs = new Set(this.contagem.keys());
    regs.add('9900');
    regs.add('9990');
    regs.add('9999');
    const qtd9900 = regs.size; // uma linha 9900 por registro distinto do arquivo

    const ordenados = [...regs].sort();
    const linhas9900 = ordenados.map(reg => {
      const c = reg === '9900' ? qtd9900 : reg === '9990' ? 1 : reg === '9999' ? 1 : this.contagem.get(reg)!;
      return `|9900|${reg}|${c}|`;
    });
    this.linhas.push(...linhas9900);

    // QTD_LIN_9 = linhas do Bloco 9 = 9001 + 9900(várias) + 9990 + 9999.
    const qtdLin9 = 1 + qtd9900 + 1 + 1;
    this.linhas.push(`|9990|${qtdLin9}|`);

    const total = this.linhas.length + 1; // + a própria 9999
    this.linhas.push(`|9999|${total}|`);

    return this.linhas.join('\r\n') + '\r\n';
  }
}

// ────────────────────────────────────────────────────────────
// Tipos de entrada (montados pelo service a partir do Appwrite)
// ────────────────────────────────────────────────────────────

export interface EmpresaSped {
  cnpj: string;
  nome: string;
  ie?: string;
  uf: string;
  /** Código IBGE do município (7 dígitos). */
  codMunicipio?: string;
  im?: string;
  suframa?: string;
  /** 0 = industrial/equiparado, 1 = outros. */
  indAtividade?: string;
  fantasia?: string;
}

export interface ParticipanteSped {
  codigo: string;
  nome: string;
  cnpjCpf?: string;
  ie?: string;
  codMunicipio?: string;
  uf?: string;
}

export interface ItemSped {
  codigo: string;
  descricao: string;
  unidade?: string;
  /** 00 mercadoria revenda, 01 matéria-prima, 04 produto acabado… */
  tipoItem?: string;
  ncm?: string;
}

export interface DocumentoItemSped {
  numeroItem: number;
  codItem: string;
  descricao?: string;
  cfop: string;
  /** CST do ICMS já com origem (3 dígitos) ou CSOSN. */
  cstIcms: string;
  quantidade: number;
  unidade?: string;
  valorItem: number;
  valorDesconto?: number;
  baseIcms?: number;
  aliqIcms?: number;
  valorIcms?: number;
  baseIcmsSt?: number;
  aliqIcmsSt?: number;
  valorIcmsSt?: number;
  cstIpi?: string;
  baseIpi?: number;
  aliqIpi?: number;
  valorIpi?: number;
}

export interface DocumentoSped {
  /** ENTRADA (IND_OPER 0) | SAIDA (IND_OPER 1). */
  tipoOperacao: 'ENTRADA' | 'SAIDA';
  /** 0 = emissão própria, 1 = terceiros. */
  indEmitente: '0' | '1';
  codParticipante?: string;
  modelo: string;
  serie?: string;
  numero?: number;
  chave?: string;
  dataEmissao: string;
  dataEntradaSaida?: string;
  valorTotal: number;
  valorProdutos?: number;
  valorDesconto?: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorOutras?: number;
  valorIcms?: number;
  valorIcmsSt?: number;
  valorIpi?: number;
  valorPis?: number;
  valorCofins?: number;
  itens: DocumentoItemSped[];
}

export interface ApuracaoSpedImposto {
  debitos: number;
  creditos: number;
  saldoCredorAnterior: number;
  valorRecolher: number;
  saldoCredorTransportar: number;
}

export interface DadosSpedFiscal {
  empresa: EmpresaSped;
  /** Período de apuração. */
  periodoInicial: string;
  periodoFinal: string;
  /** 0 = original, 1 = substituto. */
  finalidade?: string;
  /** Perfil de apresentação: A, B ou C. */
  perfil?: string;
  /** Versão do leiaute (COD_VER). */
  versao?: string;
  participantes: ParticipanteSped[];
  itens: ItemSped[];
  documentos: DocumentoSped[];
  apuracaoIcms: ApuracaoSpedImposto;
  apuracaoIpi: ApuracaoSpedImposto;
}

// ────────────────────────────────────────────────────────────
// EFD ICMS/IPI (SPED Fiscal)
// ────────────────────────────────────────────────────────────

/** Unidades de medida distintas dos itens (Bloco 0190). */
function unidadesDistintas(itens: ItemSped[]): string[] {
  const set = new Set<string>();
  for (const it of itens) if (it.unidade) set.add(it.unidade);
  return [...set].sort();
}

/** Agrega os itens de um documento por (CST, CFOP, alíquota) para o C190. */
function consolidarC190(itens: DocumentoItemSped[]): Array<{
  cst: string; cfop: string; aliq: number; vlOpr: number; vlBc: number; vlIcms: number; vlBcSt: number; vlIcmsSt: number; vlIpi: number;
}> {
  const grupos = new Map<string, ReturnType<typeof consolidarC190>[number]>();
  for (const it of itens) {
    const aliq = it.aliqIcms ?? 0;
    const chave = `${it.cstIcms}|${it.cfop}|${aliq}`;
    let g = grupos.get(chave);
    if (!g) {
      g = { cst: it.cstIcms, cfop: it.cfop, aliq, vlOpr: 0, vlBc: 0, vlIcms: 0, vlBcSt: 0, vlIcmsSt: 0, vlIpi: 0 };
      grupos.set(chave, g);
    }
    g.vlOpr += it.valorItem;
    g.vlBc += it.baseIcms ?? 0;
    g.vlIcms += it.valorIcms ?? 0;
    g.vlBcSt += it.baseIcmsSt ?? 0;
    g.vlIcmsSt += it.valorIcmsSt ?? 0;
    g.vlIpi += it.valorIpi ?? 0;
  }
  return [...grupos.values()];
}

/** Agrega os itens com IPI por (CFOP, CST_IPI) para o E510. */
function consolidarE510(documentos: DocumentoSped[]): Array<{ cfop: string; cstIpi: string; vlCont: number; vlBc: number; vlIpi: number }> {
  const grupos = new Map<string, { cfop: string; cstIpi: string; vlCont: number; vlBc: number; vlIpi: number }>();
  for (const doc of documentos) {
    for (const it of doc.itens) {
      if (!(it.valorIpi || it.aliqIpi)) continue;
      const cstIpi = it.cstIpi ?? (doc.tipoOperacao === 'SAIDA' ? '50' : '00');
      const chave = `${it.cfop}|${cstIpi}`;
      let g = grupos.get(chave);
      if (!g) { g = { cfop: it.cfop, cstIpi, vlCont: 0, vlBc: 0, vlIpi: 0 }; grupos.set(chave, g); }
      g.vlCont += it.valorItem;
      g.vlBc += it.baseIpi ?? 0;
      g.vlIpi += it.valorIpi ?? 0;
    }
  }
  return [...grupos.values()];
}

/** Gera o arquivo EFD ICMS/IPI (SPED Fiscal) como string. */
export function gerarSpedFiscal(dados: DadosSpedFiscal): string {
  const b = new SpedBuilder();
  const e = dados.empresa;
  const versao = dados.versao ?? '017';
  const perfil = dados.perfil ?? 'A';
  const finalidade = dados.finalidade ?? '0';

  // ── Bloco 0 ────────────────────────────────────────────────
  b.add('0000', [
    versao, finalidade, dt(dados.periodoInicial), dt(dados.periodoFinal), tx(e.nome),
    tx(e.cnpj), '', tx(e.uf), tx(e.ie), tx(e.codMunicipio), tx(e.im), tx(e.suframa),
    perfil, e.indAtividade ?? '1',
  ]);
  const semDados = dados.documentos.length === 0 ? '1' : '0';
  b.add('0001', [semDados]);
  b.add('0005', [tx(e.fantasia || e.nome), '', '', '', '', '', '', '', '']);
  for (const p of dados.participantes) {
    const ehCnpj = (p.cnpjCpf ?? '').replace(/\D/g, '').length > 11;
    b.add('0150', [
      tx(p.codigo), tx(p.nome), '1058',
      ehCnpj ? tx(p.cnpjCpf) : '', ehCnpj ? '' : tx(p.cnpjCpf),
      tx(p.ie), tx(p.codMunicipio), '', '', '', '', '',
    ]);
  }
  for (const u of unidadesDistintas(dados.itens)) b.add('0190', [tx(u), tx(u)]);
  for (const it of dados.itens) {
    b.add('0200', [tx(it.codigo), tx(it.descricao), '', '', tx(it.unidade), it.tipoItem ?? '00', tx(it.ncm), '', '', '', '', '']);
  }
  b.addRaw('0990', [String(b.count('0000') + b.count('0001') + b.count('0005') + b.count('0150') + b.count('0190') + b.count('0200') + 1)]);

  // ── Bloco C ────────────────────────────────────────────────
  b.add('C001', [semDados]);
  for (const doc of dados.documentos) {
    const indOper = doc.tipoOperacao === 'ENTRADA' ? '0' : '1';
    b.add('C100', [
      indOper, doc.indEmitente, tx(doc.codParticipante), tx(doc.modelo), '00', tx(doc.serie),
      doc.numero !== undefined ? String(doc.numero) : '', tx(doc.chave), dt(doc.dataEmissao),
      dt(doc.dataEntradaSaida || doc.dataEmissao), vl(doc.valorTotal), '0', vl(doc.valorDesconto), '0',
      vl(doc.valorProdutos ?? doc.valorTotal), '9', vl(doc.valorFrete), vl(doc.valorSeguro), vl(doc.valorOutras),
      vl(somaItens(doc, 'baseIcms')), vl(doc.valorIcms), vl(somaItens(doc, 'baseIcmsSt')), vl(doc.valorIcmsSt),
      vl(doc.valorIpi), vl(doc.valorPis), vl(doc.valorCofins), '0', '0',
    ]);
    for (const it of doc.itens) {
      b.add('C170', [
        String(it.numeroItem), tx(it.codItem), tx(it.descricao), vl(it.quantidade, 3), tx(it.unidade),
        vl(it.valorItem), vl(it.valorDesconto), '0', tx(it.cstIcms), tx(it.cfop), '',
        vl(it.baseIcms), vl(it.aliqIcms), vl(it.valorIcms), vl(it.baseIcmsSt), vl(it.aliqIcmsSt), vl(it.valorIcmsSt),
        '0', tx(it.cstIpi), '', vl(it.baseIpi), vl(it.aliqIpi), vl(it.valorIpi),
        '', '', '', '', '', '0,00', '', '', '', '', '', '0,00', '', '',
      ]);
    }
    for (const g of consolidarC190(doc.itens)) {
      b.add('C190', [
        tx(g.cst), tx(g.cfop), vl(g.aliq), vl(g.vlOpr), vl(g.vlBc), vl(g.vlIcms), vl(g.vlBcSt), vl(g.vlIcmsSt), '0,00', vl(g.vlIpi), '',
      ]);
    }
  }
  b.addRaw('C990', [String(b.count('C001') + b.count('C100') + b.count('C170') + b.count('C190') + 1)]);

  // ── Bloco E (apuração ICMS e IPI) ──────────────────────────
  b.add('E001', [semDados]);
  const ai = dados.apuracaoIcms;
  b.add('E100', [dt(dados.periodoInicial), dt(dados.periodoFinal)]);
  b.add('E110', [
    vl(ai.debitos), '0', '0', '0', vl(ai.creditos), '0', '0', '0',
    vl(ai.saldoCredorAnterior), vl(Math.max(ai.debitos - ai.creditos - ai.saldoCredorAnterior, 0)),
    '0', vl(ai.valorRecolher), vl(ai.saldoCredorTransportar), '0',
  ]);
  const ap = dados.apuracaoIpi;
  b.add('E500', ['0', dt(dados.periodoInicial), dt(dados.periodoFinal)]);
  for (const g of consolidarE510(dados.documentos)) {
    b.add('E510', [tx(g.cfop), tx(g.cstIpi), vl(g.vlCont), vl(g.vlBc), vl(g.vlIpi)]);
  }
  b.add('E520', [
    vl(ap.saldoCredorAnterior), vl(ap.debitos), vl(ap.creditos), '0', '0',
    vl(ap.saldoCredorTransportar), vl(ap.valorRecolher),
  ]);
  b.addRaw('E990', [String(b.count('E001') + b.count('E100') + b.count('E110') + b.count('E500') + b.count('E510') + b.count('E520') + 1)]);

  // ── Bloco 1 ────────────────────────────────────────────────
  b.add('1001', [semDados]);
  b.add('1010', ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N']);
  b.addRaw('1990', [String(b.count('1001') + b.count('1010') + 1)]);

  // ── Bloco 9 (contadores) ───────────────────────────────────
  return b.finalizar();
}

/** Soma um campo numérico dos itens de um documento. */
function somaItens(doc: DocumentoSped, campo: 'baseIcms' | 'baseIcmsSt'): number {
  return doc.itens.reduce((s, it) => s + (it[campo] ?? 0), 0);
}

// ────────────────────────────────────────────────────────────
// EFD-Contribuições (PIS/COFINS) — bloco 0 + apuração consolidada (M)
// ────────────────────────────────────────────────────────────

export interface ApuracaoSpedContribuicao {
  debitos: number;
  creditos: number;
  valorRecolher: number;
}

export interface DadosSpedContribuicoes {
  empresa: EmpresaSped;
  periodoInicial: string;
  periodoFinal: string;
  finalidade?: string;
  versao?: string;
  /** Indicador de natureza da PJ / regime. */
  regime: RegimeFederal;
  pis: ApuracaoSpedContribuicao;
  cofins: ApuracaoSpedContribuicao;
}

/** Monta os campos do M200/M600 (PIS/COFINS) conforme o regime federal. */
function camposM(regime: RegimeFederal, a: ApuracaoSpedContribuicao): Array<string | number> {
  const naoCum = regime === 'NAO_CUMULATIVO';
  return [
    naoCum ? a.debitos : 0,                          // VL_TOT_CONT_NC_PER
    naoCum ? a.creditos : 0,                         // VL_TOT_CRED_DESC
    0,                                               // VL_TOT_CRED_DESC_ANT
    naoCum ? Math.max(a.debitos - a.creditos, 0) : 0, // VL_TOT_CONT_NC_DEV
    0,                                               // VL_RET_NC
    0,                                               // VL_OUT_DED_NC
    naoCum ? a.valorRecolher : 0,                    // VL_CONT_NC_REC
    naoCum ? 0 : a.debitos,                          // VL_TOT_CONT_CUM_PER
    0,                                               // VL_RET_CUM
    0,                                               // VL_OUT_DED_CUM
    naoCum ? 0 : a.valorRecolher,                    // VL_CONT_CUM_REC
    a.valorRecolher,                                 // VL_TOT_CONT_REC
  ];
}

/** Gera o arquivo EFD-Contribuições (bloco 0 + apuração M consolidada) como string. */
export function gerarSpedContribuicoes(dados: DadosSpedContribuicoes): string {
  const b = new SpedBuilder();
  const e = dados.empresa;
  const versao = dados.versao ?? '006';
  const finalidade = dados.finalidade ?? '0';
  // Código de incidência tributária: 1 escrituração de operações com incidência exclusivamente
  // no regime não-cumulativo; 2 cumulativo.
  const codIncTrib = dados.regime === 'NAO_CUMULATIVO' ? '1' : '2';

  // ── Bloco 0 ────────────────────────────────────────────────
  b.add('0000', [
    versao, finalidade, dt(dados.periodoInicial), dt(dados.periodoFinal), tx(e.nome),
    tx(e.cnpj), tx(e.uf), tx(e.codMunicipio), tx(e.suframa), e.indAtividade ?? '1',
  ]);
  b.add('0001', ['0']);
  // 0110: regimes de apuração da contribuição.
  b.add('0110', [codIncTrib, '1', '', '']);
  b.addRaw('0990', [String(b.count('0000') + b.count('0001') + b.count('0110') + 1)]);

  // ── Bloco M (apuração consolidada) ─────────────────────────
  b.add('M001', ['0']);
  b.add('M200', camposM(dados.regime, dados.pis));
  b.add('M600', camposM(dados.regime, dados.cofins));
  b.addRaw('M990', [String(b.count('M001') + b.count('M200') + b.count('M600') + 1)]);

  // ── Bloco 9 ────────────────────────────────────────────────
  return b.finalizar();
}
