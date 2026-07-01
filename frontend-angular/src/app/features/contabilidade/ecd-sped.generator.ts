// ─────────────────────────────────────────────────────────────────────────────
//  GERADOR DE ARQUIVO ECD (SPED Contábil) — leiaute oficial da Receita Federal
//
//  Implementa o "Manual de Orientação do Leiaute da ECD" (especificação pública,
//  sped.rfb.gov.br). Gera o arquivo TXT no formato oficial: registros delimitados
//  por "|", organizados em Blocos 0, I, J e 9, com contagem de registros (9900),
//  contagem de linhas por bloco (X990 / 9990) e total do arquivo (9999).
//
//  Tipo de escrituração suportado: G (Livro Diário Geral).
//  Código puro, sem Angular — testável isoladamente.
//
//  ⚠️ Antes de transmitir: validar no PVA (Programa Validador e Assinador) da RFB.
//     Os Blocos 0 e I (Livro Diário) seguem o leiaute confirmado campo a campo.
//     O Bloco J (demonstrações) exige os "códigos de aglutinação" (COD_AGL) da
//     entidade e seus campos variam por versão do leiaute — revisar no PVA.
// ─────────────────────────────────────────────────────────────────────────────

// ── Entradas ───────────────────────────────────────────────────────────────
export interface EcdEmpresa {
  nome: string;
  cnpj: string;            // 14 dígitos, só números
  uf: string;              // sigla
  codMun: string;          // código IBGE (7 dígitos)
  descMun?: string;        // nome do município (registro I030)
  ie?: string;
  im?: string;
  nire?: string;
  dtIni: string | Date;    // início do período (DT_INI)
  dtFim: string | Date;    // fim do período (DT_FIN)
  indSitEsp?: string;      // situação especial: vazio = normal
  indSitIniPer?: string;   // 0 = início regular (default)
  indFinEsc?: string;      // 0 = original, 1 = substituta (default 0)
  indEmpGrdPrt?: 'S' | 'N';// empresa de grande porte (default N)
  versaoLeiaute?: string;  // COD_VER_LC, ex. "9.00"
  numOrdemLivro?: string;  // NUM_ORD do livro (I030)
  natLivro?: string;       // título do livro (I030), ex. "LIVRO DIÁRIO"
}

export interface EcdConta {
  codigo: string;
  codSuperior?: string;
  descricao: string;
  classificacao: string;   // ATIVO|PASSIVO|PATRIMONIO_LIQUIDO|RECEITA|DESPESA|CUSTO|COMPENSACAO|...
  tipo: string;            // SINTETICA|ANALITICA (ou GRUPO/ANALITICA)
  nivel: number;
  dtAlteracao?: string | Date;
  /** Código da conta no plano referencial da RFB (gera o registro I051 — COD_CTA_REF). */
  codCtaRef?: string;
}

export interface EcdSaldoConta {
  codigo: string;
  codCcus?: string;
  saldoInicial: number;
  debitos: number;
  creditos: number;
  saldoFinal: number;
  naturezaDevedora: boolean; // true = saldo natural devedor
}
export interface EcdSaldoPeriodo { dtIni: string | Date; dtFim: string | Date; contas: EcdSaldoConta[]; }

export interface EcdPartida {
  codigo: string;
  codCcus?: string;
  valor: number;           // sempre positivo
  dc: 'D' | 'C';
  codHistPad?: string;
  historico?: string;
}
export interface EcdLancamento { numero: number; data: string | Date; partidas: EcdPartida[]; }

export interface EcdContaResultado { codigo: string; codCcus?: string; valor: number; naturezaDevedora: boolean; }
export interface EcdSaldoResultado { dtRes: string | Date; contas: EcdContaResultado[]; }

export interface EcdLinhaDem {
  codAgl: string;
  nivel: number;
  descricao: string;
  valor: number;
  naturezaDevedora?: boolean; // J100
  indGrpBal?: 'A' | 'P';      // J100: Ativo / Passivo
  valorInicial?: number;      // J100
}
export interface EcdDemonstracao { id: string; cabecalho?: string; tipo: 'BP' | 'DRE'; linhas: EcdLinhaDem[]; }

export interface EcdSignatario {
  nome: string;
  cpfCnpj: string;
  qualificacao: string;    // código da tabela "Qualificação do Assinante" (ex. 900 sócio, 223 contador)
  crc?: string;
}

export interface EcdDados {
  empresa: EcdEmpresa;
  contas: EcdConta[];
  saldosPeriodicos: EcdSaldoPeriodo[];
  lancamentos: EcdLancamento[];
  saldoResultado?: EcdSaldoResultado;
  demonstracoes?: EcdDemonstracao[];
  signatarios?: EcdSignatario[];
}

export interface EcdResultado { arquivo: string; totalLinhas: number; avisos: string[]; }

// ── Formatação SPED ──────────────────────────────────────────────────────────
const QTD_LIN_TOKEN = '@@QTD_LIN@@';

function campo(v: string | number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v);
}
/** Monta uma linha SPED: |campo1|campo2|...| */
function L(...campos: (string | number | null | undefined)[]): string {
  return '|' + campos.map(campo).join('|') + '|';
}
/** Valor monetário no padrão SPED: ponto decimal vira vírgula, sem separador de milhar. */
function vl(v: number): string {
  return (Math.round((Math.abs(v) + Number.EPSILON) * 100) / 100).toFixed(2).replace('.', ',');
}
/** Data no formato ddmmaaaa exigido pelo SPED. */
function dt(d: string | Date | undefined): string {
  if (!d) return '';
  const iso = typeof d === 'string' ? d : d.toISOString();
  const [y, m, day] = iso.slice(0, 10).split('-');
  return `${day}${m}${y}`;
}
/** Indicador D/C de um saldo, dado o sinal e a natureza natural da conta. */
function indDC(saldo: number, naturezaDevedora: boolean): 'D' | 'C' {
  const devedor = saldo >= 0 ? naturezaDevedora : !naturezaDevedora;
  return devedor ? 'D' : 'C';
}
/** COD_NAT (natureza da conta) a partir da classificação do plano. */
function codNat(classificacao: string): string {
  const c = (classificacao || '').toUpperCase();
  if (c.startsWith('ATIVO')) return '01';
  if (c.startsWith('PASSIVO')) return '02';
  if (c.includes('PATRIMONIO') || c === 'PL') return '03';
  if (c.startsWith('RECEITA') || c.startsWith('DESPESA') || c.startsWith('CUSTO') || c.startsWith('RESULTADO')) return '04';
  if (c.startsWith('COMPENSA')) return '05';
  return '09';
}
function indCta(tipo: string): 'S' | 'A' {
  const t = (tipo || '').toUpperCase();
  return t.startsWith('ANAL') ? 'A' : 'S';
}

// ── Gerador ──────────────────────────────────────────────────────────────────
export function gerarEcd(dados: EcdDados): EcdResultado {
  const avisos: string[] = [];
  const { empresa, contas } = dados;
  const ver = empresa.versaoLeiaute || '9.00';

  // ===== BLOCO 0 — Abertura e identificação =====
  // 0000 é a PRIMEIRA linha do arquivo, antes mesmo da abertura do bloco (0001).
  const reg0000 = L('0000', 'LECD', dt(empresa.dtIni), dt(empresa.dtFim), empresa.nome, empresa.cnpj,
    empresa.uf, empresa.ie, empresa.codMun, empresa.im,
    empresa.indSitEsp ?? '', empresa.indSitIniPer ?? '0', '0',
    empresa.indFinEsc ?? '0', '', '', empresa.indEmpGrdPrt ?? 'N');
  const corpo0: string[] = []; // demais registros do bloco 0 (0007/0150/... se houver)
  const bloco0 = montarBloco('0', corpo0, '0', reg0000);

  // ===== BLOCO I — Lançamentos contábeis (Livro Diário) =====
  const corpoI: string[] = [];
  // I010 — Identificação da escrituração contábil (G = Diário Geral)
  corpoI.push(L('I010', 'G', ver));
  // I030 — Termo de abertura (QTD_LIN preenchido no fim com o total do arquivo)
  corpoI.push(L('I030', 'TERMO DE ABERTURA', empresa.numOrdemLivro ?? '1', empresa.natLivro ?? 'LIVRO DIÁRIO',
    QTD_LIN_TOKEN, empresa.nome, empresa.nire ?? '', empresa.cnpj, '', '', empresa.descMun ?? '', '', '', ''));

  // I050 — Plano de contas (sintéticas antes das analíticas, por código)
  const contasOrd = [...contas].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  for (const c of contasOrd) {
    corpoI.push(L('I050', dt(c.dtAlteracao ?? empresa.dtIni), codNat(c.classificacao), indCta(c.tipo),
      String(c.nivel ?? ''), c.codigo, c.codSuperior ?? '', c.descricao));
    // I051 — mapeamento p/ o plano de contas referencial da RFB (COD_ENT_REF vazio = RFB).
    if (c.codCtaRef) corpoI.push(L('I051', '', '', c.codCtaRef));
  }
  if (!contasOrd.length) avisos.push('Plano de contas vazio: nenhum registro I050 gerado.');

  // I150/I155 — Saldos periódicos (por período, só contas analíticas com movimento)
  for (const per of dados.saldosPeriodicos) {
    const comMov = per.contas.filter(c => Math.abs(c.debitos) + Math.abs(c.creditos) > 0.0001);
    if (!comMov.length) continue;
    corpoI.push(L('I150', dt(per.dtIni), dt(per.dtFim)));
    for (const s of comMov) {
      corpoI.push(L('I155', s.codigo, s.codCcus ?? '',
        vl(s.saldoInicial), indDC(s.saldoInicial, s.naturezaDevedora),
        vl(s.debitos), vl(s.creditos),
        vl(s.saldoFinal), indDC(s.saldoFinal, s.naturezaDevedora)));
    }
  }

  // I200/I250 — Lançamentos e suas partidas
  for (const lc of dados.lancamentos) {
    const totalDeb = lc.partidas.filter(p => p.dc === 'D').reduce((s, p) => s + Math.abs(p.valor), 0);
    const totalCred = lc.partidas.filter(p => p.dc === 'C').reduce((s, p) => s + Math.abs(p.valor), 0);
    if (Math.abs(totalDeb - totalCred) > 0.01) {
      avisos.push(`Lançamento nº ${lc.numero}: débitos (${vl(totalDeb)}) ≠ créditos (${vl(totalCred)}).`);
    }
    corpoI.push(L('I200', String(lc.numero), dt(lc.data), vl(totalDeb), 'N'));
    for (const p of lc.partidas) {
      corpoI.push(L('I250', p.codigo, p.codCcus ?? '', vl(p.valor), p.dc, '',
        p.codHistPad ?? '', p.historico ?? '', ''));
    }
  }
  if (!dados.lancamentos.length) avisos.push('Nenhum lançamento no período: registros I200/I250 ausentes.');

  // I350/I355 — Saldos das contas de resultado antes do encerramento
  if (dados.saldoResultado && dados.saldoResultado.contas.length) {
    corpoI.push(L('I350', dt(dados.saldoResultado.dtRes)));
    for (const r of dados.saldoResultado.contas) {
      corpoI.push(L('I355', r.codigo, r.codCcus ?? '', vl(r.valor), indDC(r.valor, r.naturezaDevedora)));
    }
  }
  const blocoI = montarBloco('I', corpoI, '0');

  // ===== BLOCO J — Demonstrações contábeis =====
  const corpoJ: string[] = [];
  for (const dem of (dados.demonstracoes ?? [])) {
    corpoJ.push(L('J005', dt(empresa.dtIni), dt(empresa.dtFim), dem.id, dem.cabecalho ?? ''));
    if (dem.tipo === 'BP') {
      for (const ln of dem.linhas) {
        corpoJ.push(L('J100', ln.codAgl, String(ln.nivel), ln.indGrpBal ?? 'A', ln.descricao,
          vl(ln.valor), indDC(ln.valor, ln.naturezaDevedora ?? true),
          vl(ln.valorInicial ?? 0), indDC(ln.valorInicial ?? 0, ln.naturezaDevedora ?? true)));
      }
    } else {
      for (const ln of dem.linhas) {
        corpoJ.push(L('J150', ln.codAgl, String(ln.nivel), ln.descricao,
          vl(ln.valor), ln.valor >= 0 ? 'C' : 'D'));
      }
    }
  }
  // J930 — Identificação dos signatários
  for (const sig of (dados.signatarios ?? [])) {
    corpoJ.push(L('J930', sig.nome, sig.cpfCnpj, sig.qualificacao, '1', sig.crc ? 'S' : 'N',
      '', '', empresa.uf, sig.crc ?? '', ''));
  }
  if (dados.demonstracoes?.length) {
    avisos.push('Bloco J gerado com códigos de aglutinação sintéticos — substituir pelos COD_AGL oficiais da entidade e validar no PVA.');
  }
  const blocoJ = corpoJ.length ? montarBloco('J', corpoJ, '0') : [];

  // ===== Montagem + Bloco 9 (contagens) =====
  const corpoArquivo = [...bloco0, ...blocoI, ...blocoJ];
  const { bloco9, totalLinhas } = montarBloco9(corpoArquivo);

  let arquivo = [...corpoArquivo, ...bloco9].join('\r\n') + '\r\n';
  arquivo = arquivo.replace(QTD_LIN_TOKEN, String(totalLinhas));

  if (!dados.signatarios?.length) avisos.push('Nenhum signatário (J930): a ECD precisa de ao menos o responsável e o contabilista.');

  return { arquivo, totalLinhas, avisos };
}

/**
 * Envolve o corpo de um bloco com abertura (X001) e encerramento (X990 = total de
 * linhas do bloco). `cabecalho` é uma linha que precede a abertura (usado pelo
 * Bloco 0, onde o registro 0000 vem antes do 0001) e também conta no total.
 */
function montarBloco(cod: '0' | 'I' | 'J', corpo: string[], indMov: string, cabecalho?: string): string[] {
  const linhas: string[] = [];
  if (cabecalho) linhas.push(cabecalho);
  linhas.push(L(cod + '001', indMov));
  linhas.push(...corpo);
  const total = linhas.length + 1; // + encerramento
  linhas.push(L(cod + '990', String(total)));
  return linhas;
}

/** Bloco 9: 9001, um 9900 por tipo de registro (incl. 9001/9900/9990/9999), 9990 e 9999. */
function montarBloco9(corpoArquivo: string[]): { bloco9: string[]; totalLinhas: number } {
  // Contagem por tipo de registro (1ª aparição preserva a ordem)
  const tally = new Map<string, number>();
  for (const linha of corpoArquivo) {
    const reg = linha.slice(1, linha.indexOf('|', 1));
    tally.set(reg, (tally.get(reg) ?? 0) + 1);
  }
  const regs0IJ = [...tally.keys()];
  const num9900 = regs0IJ.length + 4; // + 9001, 9900, 9990, 9999

  const linhas9900: string[] = [];
  for (const reg of regs0IJ) linhas9900.push(L('9900', reg, String(tally.get(reg))));
  linhas9900.push(L('9900', '9001', '1'));
  linhas9900.push(L('9900', '9900', String(num9900)));
  linhas9900.push(L('9900', '9990', '1'));
  linhas9900.push(L('9900', '9999', '1'));

  const qtdLin9 = 1 /*9001*/ + num9900 + 1 /*9990*/;
  const bloco9 = [L('9001', '0'), ...linhas9900, L('9990', String(qtdLin9))];

  const totalLinhas = corpoArquivo.length + bloco9.length + 1 /*9999*/;
  bloco9.push(L('9999', String(totalLinhas)));
  return { bloco9, totalLinhas };
}
