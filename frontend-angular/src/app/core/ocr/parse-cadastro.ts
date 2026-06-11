/**
 * Parser de documentos de cadastro (portado de functions/_shared/ocr/parse-cadastro.js).
 * Roda 100% no navegador — recebe o texto do OCR (tesseract.js) e devolve os campos
 * do cadastro. Sem API externa.
 */

export interface ParseResult {
  nomeCompleto: string | null; cpf: string | null; rg: string | null;
  dataNascimento: string | null; nomeMae: string | null; nomePai: string | null;
  cep: string | null; logradouro: string | null; numero: string | null;
  bairro: string | null; cidade: string | null; estado: string | null;
  cnpj: string | null; razaoSocial: string | null; nomeFantasia: string | null;
  dataAbertura: string | null; naturezaJuridica: string | null;
  cnaePrincipal: string | null; capitalSocial: string | null;
  socios: { nome: string | null; cpf: string; participacao: string | null }[];
  confidence: number; camposComBaixaConfianca: string[]; avisos: string[];
}

export type TipoPessoa = 'PF' | 'PJ';
export type TipoDocumento = 'CNH' | 'RG' | 'COMPROVANTE_ENDERECO' | 'CNPJ' | 'CONTRATO_SOCIAL';

const soDigitos = (v: unknown): string => (v == null ? '' : String(v).replace(/\D/g, ''));

const mascararCpf = (v: string): string => {
  const d = soDigitos(v);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d;
};
const mascararCnpj = (v: string): string => {
  const d = soDigitos(v);
  return d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d;
};
const mascararCep = (v: string): string => {
  const d = soDigitos(v);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : d;
};

export function isValidCpf(cpf: string): boolean {
  cpf = soDigitos(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let d1 = 11 - (soma % 11); if (d1 >= 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  let d2 = 11 - (soma % 11); if (d2 >= 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

export function isValidCnpj(cnpj: string): boolean {
  cnpj = soDigitos(cnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string, pesos: number[]): number => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += Number(base[i]) * pesos[i];
    const r = 11 - (soma % 11);
    return r >= 10 ? 0 : r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  if (calc(cnpj, p1) !== Number(cnpj[12])) return false;
  return calc(cnpj, p2) === Number(cnpj[13]);
}

const RE = {
  cpf: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
  cnpj: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,
  cep: /\d{5}-?\d{3}/,
  data: /\d{2}\/\d{2}\/\d{4}/,
  cnae: /\d{2}\.?\d{2}-?\d-?\d{2}/,
  valor: /R\$\s*([\d.]+,\d{2})/,
};

const UFS = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB',
  'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);

function normalizar(s: unknown): string {
  if (s == null) return '';
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

function limparNome(bruto: string | null): string | null {
  if (bruto == null) return null;
  const limpo = String(bruto)
    .replace(/[0-9]/g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return limpo ? limpo.toUpperCase() : null;
}

/**
 * Limpa nome de PESSOA e remove ruído de OCR nas pontas. Em documentos brasileiros
 * o nome costuma vir ladeado por texto de segurança/holograma que o OCR lê como
 * tokens curtos soltos. Remove tokens de 1-2 letras no início e de 1 letra no fim.
 */
function limparNomePessoa(bruto: string | null): string | null {
  const base = limparNome(bruto);
  if (!base) return null;
  const toks = base.split(/\s+/);
  while (toks.length > 2 && toks[0].length <= 2) toks.shift();
  while (toks.length > 2 && toks[toks.length - 1].length <= 1) toks.pop();
  return toks.join(' ') || base;
}

function normalizarOcr(texto: string): string {
  return texto.replace(/\$/g, '1').replace(/[|]/g, '1');
}

/**
 * Palavras de rótulo (PT/EN/ES) presentes em CNH/RG/CIN que NUNCA fazem parte de um
 * nome real. Servem para descartar candidatos a nome que, na verdade, são o texto do
 * rótulo lido pelo OCR — ex.: "SOBRENOME NAME AND SURNAME NOMBRE Y APELLIDOS PRIMEIRA
 * HABILITAÇÃO FIRST DRIVER LICENSE". Partículas válidas (DE/DA/DO/E) ficam de fora.
 */
const RUIDO_NOME = new Set([
  'NOME', 'SOBRENOME', 'NAME', 'SURNAME', 'NOMBRE', 'APELLIDOS', 'APELIDOS',
  'FILIACAO', 'FILIATION', 'FILIACION', 'SOCIAL',
  'HABILITACAO', 'LICENSE', 'LICENCE', 'DRIVER', 'LICENCIA',
  'PERMIT', 'PERMISSAO', 'DIRIGIR', 'PRIMERA', 'PRIMEIRA', 'FIRST',
  'VALIDADE', 'VALIDITY', 'EXPIRY', 'CATEGORIA', 'CATEGORY',
  'DOC', 'IDENTIDADE', 'IDENTITY', 'REGISTRO', 'GERAL', 'PERSONAL', 'NUMBER',
  'REPUBLICA', 'FEDERATIVA', 'BRASIL', 'BRAZIL', 'CARTEIRA', 'NACIONAL',
  'NATIONALITY', 'NACIONALIDADE', 'BIRTH', 'NASCIMENTO', 'EXPEDICAO',
  'GOVERNO', 'FEDERAL', 'SECRETARIA', 'SEGURANCA', 'PUBLICA', 'EMISSOR',
]);

/** true se o texto (maiúsculas, sem acento) contém alguma palavra de rótulo. */
function contemRuidoNome(nome: string | null): boolean {
  if (!nome) return false;
  return normalizar(nome).split(/\s+/).some((t) => RUIDO_NOME.has(t));
}

const RE_CPF_LINHA = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/;
const RE_DATA_LINHA = /\d{2}\/\d{2}\/\d{4}/;

/**
 * Extrai um nome de PESSOA a partir do rótulo, pulando candidatos que são ruído de
 * rótulo multilíngue (CNH/RG/CIN). Devolve null quando só há ruído — melhor deixar em
 * branco para preenchimento manual do que preencher lixo no cadastro.
 */
function extrairNomePessoa(orig: string[], norm: string[], labels: string[]): string | null {
  const ehNome = (c: string | null): c is string =>
    !!c && c.split(/\s+/).length >= 2 && !contemRuidoNome(c);

  for (let i = 0; i < norm.length; i++) {
    for (const label of labels) {
      const idx = norm[i].indexOf(normalizar(label));
      if (idx < 0) continue;

      // 1) candidato na mesma linha, após o rótulo
      const mesma = limparNomePessoa(
        orig[i].substring(Math.min(idx + label.length, orig[i].length)).replace(/^[\s:\-/]+/, '').trim());
      if (ehNome(mesma)) return mesma;

      // 2) procura o nome nas linhas seguintes
      for (let j = i + 1; j < Math.min(i + 6, orig.length); j++) {
        const linha = orig[j].trim();
        if (!linha) continue;
        const cand = limparNomePessoa(linha);
        if (ehNome(cand)) return cand;
        // parou em outro campo evidente (CPF/data) — não há nome aqui
        if (RE_CPF_LINHA.test(linha) || RE_DATA_LINHA.test(linha)) break;
      }
    }
  }
  return null;
}

const LABELS_CONHECIDOS = [
  'CPF', 'RG', 'FILIACAO', 'FILIAÇÃO', 'MAE', 'MÃE', 'PAI',
  'NASCIMENTO', 'DATA DE NASCIMENTO', 'DATA NASCIMENTO', 'NATURALIDADE', 'SEXO',
  'ESTADO', 'UF', 'REGISTRO', 'REGISTRO GERAL', 'DOC IDENTIDADE', 'ORG EMISSOR',
  'VALIDADE', 'CNH', 'HABILITACAO', 'CATEGORIA', 'MUNICIPIO', 'CIDADE',
  'LOGRADOURO', 'ENDERECO', 'BAIRRO', 'CEP', 'NUMERO',
  'CNPJ', 'RAZAO SOCIAL', 'NOME EMPRESARIAL', 'ABERTURA',
  'NATUREZA JURIDICA', 'ATIVIDADE ECONOMICA', 'CAPITAL SOCIAL',
  'NOME DA MAE', 'NOME DO PAI',
  'REPUBLICA FEDERATIVA DO BRASIL', 'CARTEIRA DE IDENTIDADE',
  'CARTEIRA NACIONAL DE HABILITACAO', 'NOME',
  // Rótulos em inglês da CIN (Carteira de Identidade Nacional, bilíngue).
  'NAME', 'SOCIAL NAME', 'PERSONAL NUMBER', 'DATE OF BIRTH', 'FILIATION',
  'PLACE OF BIRTH', 'EXPIRY', 'NATIONALITY', 'GOVERNO FEDERAL',
  'SECRETARIA DE SEGURANCA PUBLICA',
];

function ehLabel(texto: string): boolean {
  if (!texto) return false;
  const norm = normalizar(texto.trim());
  if (norm.length <= 3) return true;
  for (const lbl of LABELS_CONHECIDOS) {
    const lN = normalizar(lbl);
    if (norm === lN || norm.startsWith(lN + ' ') || norm.startsWith(lN + ':')) return true;
  }
  return false;
}

function valorAposLabel(orig: string[], norm: string[], labels: string[]): string | null {
  for (let i = 0; i < norm.length; i++) {
    for (const label of labels) {
      const idx = norm[i].indexOf(normalizar(label));
      if (idx >= 0) {
        const resto = orig[i].substring(Math.min(idx + label.length, orig[i].length))
          .replace(/^[\s:\-/]+/, '').trim();
        if (resto && !ehLabel(resto)) return resto;
        for (let j = i + 1; j < orig.length; j++) {
          const linha = orig[j].trim();
          if (linha && !ehLabel(linha)) return linha;
        }
      }
    }
  }
  return null;
}

function primeiraDataLabel(orig: string[], norm: string[], labels: string[]): string | null {
  for (let i = 0; i < norm.length; i++) {
    for (const label of labels) {
      const idx = norm[i].indexOf(normalizar(label));
      if (idx >= 0) {
        const resto = orig[i].substring(idx + label.length);
        const mLinha = resto.match(RE.data);
        if (mLinha) return mLinha[0];
        for (let j = i + 1; j < Math.min(i + 4, orig.length); j++) {
          const m = orig[j].match(RE.data);
          if (m) return m[0];
        }
      }
    }
  }
  return null;
}

function extrairCpf(texto: string, r: ParseResult): string | null {
  const textoNorm = normalizarOcr(texto);
  const matches = textoNorm.match(RE.cpf) || [];
  for (const m of matches) {
    if (isValidCpf(m)) return mascararCpf(m);
  }
  if (matches[0]) {
    marcar(r, 'cpf');
    addAviso(r, 'CPF extraído não passou na validação dos dígitos verificadores.');
    return mascararCpf(matches[0]);
  }
  return null;
}

function extrairCnpj(texto: string, r: ParseResult): string | null {
  const matches = texto.match(RE.cnpj) || [];
  for (const m of matches) {
    if (isValidCnpj(m)) return mascararCnpj(m);
  }
  if (matches[0]) {
    marcar(r, 'cnpj');
    addAviso(r, 'CNPJ extraído não passou na validação dos dígitos verificadores.');
    return mascararCnpj(matches[0]);
  }
  return null;
}

function extrairRg(orig: string[], norm: string[], ehCnh: boolean): string | null {
  for (let i = 0; i < norm.length; i++) {
    const n = norm[i];
    const temRgLabel = n === 'RG' || n.startsWith('RG ') || n.startsWith('RG:') ||
      n.includes(' RG') || n.includes(':RG') ||
      n.startsWith('REGISTRO GERAL') || n.startsWith('DOC IDENTIDADE');

    if (!temRgLabel) continue;

    const labelEnd = (() => {
      for (const lbl of ['DOC IDENTIDADE', 'REGISTRO GERAL', 'RG']) {
        const idx = n.indexOf(normalizar(lbl));
        if (idx >= 0) return idx + lbl.length;
      }
      return 0;
    })();

    const resto = orig[i].substring(labelEnd).replace(/^[\s:\-]+/, '').trim();
    if (resto) {
      const restoCNH = ehCnh ? resto.split(/\s*\/\s*/)[0].trim() : resto;
      const rgM = restoCNH.match(/\d[\d.\-\s]{2,}[\dX]/);
      if (rgM) {
        const candidate = rgM[0].replace(/\s+/g, '').trim();
        if (!candidate.match(/^\d{2}\/\d{2}\/\d{4}$/) && candidate.length >= 5) return candidate;
      }
    }

    for (let j = i + 1; j < Math.min(i + 4, orig.length); j++) {
      const linha = orig[j].trim();
      if (!linha) continue;
      const rgM = linha.match(/\b\d[\d.\-]{4,}[\dX]\b/);
      if (rgM) {
        const candidate = rgM[0].trim();
        if (!candidate.match(/^\d{2}\/\d{2}\/\d{4}$/) && candidate.length >= 5) return candidate;
      }
      if (ehLabel(linha)) break;
    }
  }
  return null;
}

function extrairCnae(orig: string[], norm: string[]): string | null {
  for (let i = 0; i < norm.length; i++) {
    if (norm[i].includes('ATIVIDADE ECONOMICA PRINCIPAL')) {
      for (let j = i; j < Math.min(i + 2, orig.length); j++) {
        const m = orig[j].match(RE.cnae);
        if (m) {
          const desc = orig[j].substring(orig[j].indexOf(m[0]) + m[0].length).replace(/^[\s\-]+/, '').trim();
          return desc ? `${m[0]} - ${desc}` : m[0];
        }
      }
    }
  }
  return null;
}

function extrairCapitalSocial(texto: string): string | null {
  const idx = normalizar(texto).indexOf('CAPITAL SOCIAL');
  if (idx < 0) return null;
  const m = texto.substring(idx).match(RE.valor);
  return m ? `R$ ${m[1]}` : null;
}

function extrairSocios(orig: string[], norm: string[]): ParseResult['socios'] {
  const socios: ParseResult['socios'] = [];
  for (let i = 0; i < norm.length; i++) {
    const linhaSocio = norm[i].includes('SOCIO') || norm[i].includes('ADMINISTRADOR');
    const cpfM = orig[i].match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    if (linhaSocio && cpfM) {
      if (!isValidCpf(cpfM[0])) continue;
      let nome = limparNome(orig[i].substring(0, orig[i].indexOf(cpfM[0])));
      if (!nome && i > 0) nome = limparNome(orig[i - 1]);
      const partM = orig[i].match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
      socios.push({ nome, cpf: mascararCpf(cpfM[0]), participacao: partM ? `${partM[1]}%` : null });
    }
  }
  return socios;
}

function extrairUf(orig: string[], norm: string[]): string | null {
  const porLabel = valorAposLabel(orig, norm, ['UF', 'ESTADO']);
  if (porLabel) {
    const cand = porLabel.trim().toUpperCase().substring(0, 2);
    if (UFS.has(cand)) return cand;
  }
  for (const linha of orig) {
    const re = /\b([A-Z]{2})\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(linha.toUpperCase()))) {
      if (UFS.has(m[1])) return m[1];
    }
  }
  return null;
}

function extrairFiliacao(orig: string[], norm: string[]): [string | null, string | null] {
  let mae: string | null = null, pai: string | null = null;

  for (let i = 0; i < norm.length; i++) {
    const n = norm[i];
    if ((n.startsWith('MAE') || n.includes('NOME DA MAE')) && mae === null) {
      const labelMatch = orig[i].match(/M[AÃ]E\s*[:\-]?\s*/i) || orig[i].match(/NOME\s+DA\s+M[AÃ]E\s*[:\-]?\s*/i);
      const labelLen = labelMatch ? labelMatch[0].length : 0;
      let valor = orig[i].substring(labelLen).trim();
      if (!valor) {
        for (let j = i + 1; j < orig.length; j++) {
          if (orig[j].trim()) { valor = orig[j].trim(); break; }
        }
      }
      const nome = limparNome(valor);
      if (nome && nome.split(/\s+/).length >= 2) mae = nome;
    }

    if ((n.startsWith('PAI') || n.includes('NOME DO PAI')) && pai === null) {
      const labelMatch = orig[i].match(/PAI\s*[:\-]?\s*/i) || orig[i].match(/NOME\s+DO\s+PAI\s*[:\-]?\s*/i);
      const labelLen = labelMatch ? labelMatch[0].length : 0;
      let valor = orig[i].substring(labelLen).trim();
      valor = valor.replace(/\s*\d[\d.\-]{3,}[\dX]\s*$/, '').trim();
      if (!valor) {
        for (let j = i + 1; j < orig.length; j++) {
          if (orig[j].trim()) { valor = orig[j].trim(); break; }
        }
      }
      const nome = limparNome(valor);
      if (nome && nome.split(/\s+/).length >= 2) pai = nome;
    }
  }

  if (mae === null && pai === null) {
    for (let i = 0; i < norm.length; i++) {
      if (!norm[i].includes('FILIACAO')) continue;
      // Coleta até 2 nomes após o rótulo FILIAÇÃO, pulando linhas de ruído (sem
      // quebrar nelas) e parando em outra seção (CPF/data/observações/etc.).
      const nomes: string[] = [];
      for (let j = i + 1; j < Math.min(i + 12, orig.length) && nomes.length < 2; j++) {
        const linha = orig[j].trim();
        if (!linha) continue;
        if (RE_CPF_LINHA.test(linha) || RE_DATA_LINHA.test(linha)
          || norm[j].includes('OBSERVA') || norm[j].includes('NACIONALIDADE')
          || norm[j].includes('CATEGORIA')) break;
        const cand = limparNomePessoa(linha.replace(/\s*\d[\d.\-]{3,}[\dX]\s*$/, '').trim());
        if (cand && cand.split(/\s+/).length >= 2 && !contemRuidoNome(cand)) nomes.push(cand);
      }
      if (nomes.length === 1) mae = nomes[0];
      else if (nomes.length >= 2) { mae = nomes[0]; pai = nomes[1]; }
      break;
    }
  }

  return [mae, pai];
}

/**
 * Fallback de filiação para CNH/CIN cujo OCR embaralha o layout (2 colunas) e a
 * label "Filiação" sai corrompida (ex.: "iliação"). Coleta nomes próprios em
 * MAIÚSCULAS no FIM das linhas (≥2 palavras), descartando o titular e ruído de
 * rótulo. Na CIN os nomes de mãe/pai aparecem como sequências maiúsculas no fim
 * de linhas, mesmo quando a label não é reconhecida.
 */
function nomesCandidatosFiliacao(orig: string[], excluirNorm: Set<string>): string[] {
  const reTrailing = /([A-ZÀ-Ý][A-ZÀ-Ý'’.\-]*(?:\s+[A-ZÀ-Ý][A-ZÀ-Ý'’.\-]*)+)\s*$/;
  const out: string[] = [];
  for (const linha of orig) {
    const m = linha.match(reTrailing);
    if (!m) continue;
    const nome = limparNomePessoa(m[1]);
    if (!nome || nome.split(/\s+/).length < 2 || contemRuidoNome(nome)) continue;
    const nm = normalizar(nome);
    if (excluirNorm.has(nm) || out.some((x) => normalizar(x) === nm)) continue;
    out.push(nome);
    if (out.length >= 2) break;
  }
  return out;
}

/**
 * Lê a zona MRZ (machine-readable, rodapé da CNH-e/CIN) — desenhada para leitura por
 * máquina, é a fonte MAIS confiável de nome e nascimento quando o resto do layout sai
 * embaralhado. Ex.: nome `GUSTAVO<<OLIVEIRA<SANTIAGO`; datas `0412292M330103...`.
 */
function parseMrz(orig: string[]): { nome: string | null; nascimento: string | null } {
  let nome: string | null = null;
  let nascimento: string | null = null;
  const anoAtual = new Date().getFullYear();
  for (const linha of orig) {
    const l = linha.replace(/\s+/g, '');
    if (l.length < 8 || !/^[A-Z0-9<OQ]+$/.test(l)) continue;
    // Linha de NOME: contém '<<' e ao menos 2 tokens só de letras.
    if (!nome && l.includes('<<')) {
      const toks = l.split(/<+/).filter((t) => /^[A-Z]{2,}$/.test(t));
      if (toks.length >= 2) nome = toks.join(' ');
    }
    // Linha de DATAS: começa com YYMMDD (dígitos, O/Q viram 0) + sexo M/F.
    if (!nascimento) {
      const m = l.match(/^([0-9OQ]{6})[0-9OQ<]?([MF])/);
      if (m) {
        const d = m[1].replace(/[OQ]/g, '0');
        const yy = +d.slice(0, 2), mm = +d.slice(2, 4), dd = +d.slice(4, 6);
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          const ano = 2000 + yy <= anoAtual ? 2000 + yy : 1900 + yy;
          nascimento = `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${ano}`;
        }
      }
    }
  }
  return { nome, nascimento };
}

/** Filiação: tenta a extração por label e, se falhar, o fallback por nomes maiúsculos. */
function resolverFiliacao(orig: string[], norm: string[], titular: string | null): [string | null, string | null] {
  let [mae, pai] = extrairFiliacao(orig, norm).map(limparNomePessoa) as [string | null, string | null];
  if (!mae && !pai) {
    const excluir = new Set<string>();
    if (titular) excluir.add(normalizar(titular));
    const cands = nomesCandidatosFiliacao(orig, excluir);
    mae = cands[0] ?? null;
    pai = cands[1] ?? null;
  }
  return [mae, pai];
}

function preencherEndereco(texto: string, orig: string[], norm: string[], r: ParseResult): void {
  const cepM = texto.match(RE.cep);
  if (cepM) r.cep = mascararCep(cepM[0]);
  const logradouro = valorAposLabel(orig, norm, ['LOGRADOURO', 'ENDERECO', 'RUA', 'AVENIDA']);
  r.logradouro = logradouro;
  r.numero = valorAposLabel(orig, norm, ['NUMERO']);
  r.bairro = valorAposLabel(orig, norm, ['BAIRRO', 'DISTRITO']);
  r.cidade = valorAposLabel(orig, norm, ['MUNICIPIO', 'CIDADE']);
  r.estado = extrairUf(orig, norm);
  if (!r.numero && logradouro) {
    const numM = logradouro.match(/,\s*(\d{1,6})/);
    if (numM) r.numero = numM[1];
  }
}

function verificarValidadeCnh(orig: string[], norm: string[], r: ParseResult): void {
  const validade = primeiraDataLabel(orig, norm, ['VALIDADE', 'VAL']);
  if (!validade) return;
  const [d, m, y] = validade.split('/').map(Number);
  const venc = new Date(y, m - 1, d);
  if (!isNaN(venc.getTime()) && venc < new Date()) {
    addAviso(r, `CNH vencida em ${validade}.`);
    marcar(r, 'cnhValidade');
  }
}

function marcar(r: ParseResult, campo: string): void {
  if (campo && !r.camposComBaixaConfianca.includes(campo)) r.camposComBaixaConfianca.push(campo);
}
function addAviso(r: ParseResult, aviso: string): void {
  if (aviso && !r.avisos.includes(aviso)) r.avisos.push(aviso);
}

const CAMPOS_ESPERADOS: Record<TipoDocumento, string[]> = {
  CNH: ['nomeCompleto', 'cpf', 'dataNascimento', 'nomeMae', 'rg'],
  RG: ['nomeCompleto', 'rg', 'dataNascimento', 'nomeMae', 'nomePai'],
  COMPROVANTE_ENDERECO: ['cep', 'logradouro', 'bairro', 'cidade', 'estado'],
  CNPJ: ['cnpj', 'razaoSocial', 'nomeFantasia', 'dataAbertura', 'naturezaJuridica', 'cnaePrincipal'],
  CONTRATO_SOCIAL: ['razaoSocial', 'cnpj', 'capitalSocial'],
};

function preenchido(r: ParseResult, campo: string): boolean {
  const filled = (s: unknown) => s != null && String(s).trim() !== '';
  if (campo === 'cpf') return filled(r.cpf) && !r.camposComBaixaConfianca.includes('cpf');
  if (campo === 'cnpj') return filled(r.cnpj) && !r.camposComBaixaConfianca.includes('cnpj');
  return filled((r as unknown as Record<string, unknown>)[campo]);
}

function calcularConfianca(r: ParseResult, tipoDocumento: TipoDocumento): void {
  const esperados = CAMPOS_ESPERADOS[tipoDocumento] || [];
  let ok = 0;
  for (const campo of esperados) {
    if (preenchido(r, campo)) ok++;
    else marcar(r, campo);
  }
  const conf = esperados.length ? Math.round((100 * ok) / esperados.length) : 0;
  r.confidence = Math.max(0, Math.min(100, conf));
}

export function parseCadastro(texto: string, tipoPessoa: TipoPessoa, tipoDocumento: TipoDocumento): ParseResult {
  const orig = String(texto || '').split(/\r?\n/);
  const norm = orig.map(normalizar);

  const r: ParseResult = {
    nomeCompleto: null, cpf: null, rg: null, dataNascimento: null, nomeMae: null, nomePai: null,
    cep: null, logradouro: null, numero: null, bairro: null, cidade: null, estado: null,
    cnpj: null, razaoSocial: null, nomeFantasia: null, dataAbertura: null,
    naturezaJuridica: null, cnaePrincipal: null, capitalSocial: null,
    socios: [], confidence: 0, camposComBaixaConfianca: [], avisos: [],
  };

  switch (tipoDocumento) {
    case 'CNH':
      r.nomeCompleto = extrairNomePessoa(orig, norm, ['NOME']);
      r.cpf = extrairCpf(texto, r);
      // RG é um NÚMERO de documento — extrairRg só devolve padrão numérico (sem
      // fallback de texto solto, que pegava lixo como "Local").
      r.rg = extrairRg(orig, norm, true);
      r.dataNascimento = primeiraDataLabel(orig, norm, ['NASCIMENTO', 'DATA NASCIMENTO', 'DATA DE NASCIMENTO']);
      [r.nomeMae, r.nomePai] = resolverFiliacao(orig, norm, r.nomeCompleto);
      verificarValidadeCnh(orig, norm, r);
      break;
    case 'RG':
      r.nomeCompleto = extrairNomePessoa(orig, norm, ['NOME']);
      r.rg = extrairRg(orig, norm, false);
      r.cpf = extrairCpf(texto, r);
      r.dataNascimento = primeiraDataLabel(orig, norm, ['NASCIMENTO', 'DATA DE NASCIMENTO']);
      [r.nomeMae, r.nomePai] = resolverFiliacao(orig, norm, r.nomeCompleto);
      break;
    case 'COMPROVANTE_ENDERECO':
      preencherEndereco(texto, orig, norm, r);
      break;
    case 'CNPJ':
      r.cnpj = extrairCnpj(texto, r);
      r.razaoSocial = limparNome(valorAposLabel(orig, norm, ['NOME EMPRESARIAL', 'RAZAO SOCIAL']));
      r.nomeFantasia = limparNome(valorAposLabel(orig, norm, ['NOME DE FANTASIA', 'TITULO DO ESTABELECIMENTO']));
      r.dataAbertura = primeiraDataLabel(orig, norm, ['DATA DE ABERTURA', 'ABERTURA']);
      r.naturezaJuridica = valorAposLabel(orig, norm, ['NATUREZA JURIDICA']);
      r.cnaePrincipal = extrairCnae(orig, norm);
      preencherEndereco(texto, orig, norm, r);
      break;
    case 'CONTRATO_SOCIAL':
      r.cnpj = extrairCnpj(texto, r);
      r.razaoSocial = limparNome(valorAposLabel(orig, norm, ['RAZAO SOCIAL', 'DENOMINACAO', 'NOME EMPRESARIAL']));
      r.capitalSocial = extrairCapitalSocial(texto);
      r.socios = extrairSocios(orig, norm);
      preencherEndereco(texto, orig, norm, r);
      break;
  }

  // MRZ (rodapé da CNH-e/CIN) é a fonte mais confiável p/ nome e nascimento quando o
  // layout sai embaralhado e não há rótulo legível adjacente.
  if (tipoDocumento === 'CNH' || tipoDocumento === 'RG') {
    if (!r.nomeCompleto || !r.dataNascimento) {
      const mrz = parseMrz(orig);
      if (!r.nomeCompleto && mrz.nome) r.nomeCompleto = mrz.nome;
      if (!r.dataNascimento && mrz.nascimento) r.dataNascimento = mrz.nascimento;
    }
  }

  // CIN (novo RG) usa o CPF como número único — evita duplicar o CPF no campo RG.
  if (r.rg && r.cpf && soDigitos(r.rg) === soDigitos(r.cpf)) r.rg = null;
  // RG precisa parecer um número de documento (≥5 dígitos); senão é ruído de OCR.
  if (r.rg && soDigitos(r.rg).length < 5) r.rg = null;

  calcularConfianca(r, tipoDocumento);
  return r;
}
