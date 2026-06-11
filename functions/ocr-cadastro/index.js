'use strict';

const path = require('path');
const { parseCadastro } = require('../_shared/ocr/parse-cadastro');

// Idioma do Tesseract embutido na função (evita baixar da CDN a cada cold start,
// que estourava o teto de 30s da execução síncrona do Appwrite).
const TESSDATA_DIR = path.join(__dirname, 'tessdata');

/**
 * Appwrite Function: ocr-cadastro.
 *
 * Lê um documento (RG/CNH, comprovante de endereço, cartão CNPJ ou contrato social),
 * extrai os dados e devolve um JSON pronto para preencher o cadastro. Substitui o
 * endpoint Java POST /api/v1/integracoes/cadastros/ocr — agora 100% no Appwrite.
 *
 * OCR com tesseract.js (WASM, sem binário nativo). PDFs com texto nativo são lidos
 * via pdf-parse; PDFs escaneados (sem rasterizador no runtime) caem para preenchimento
 * manual. Nada é persistido: o usuário revisa e confirma antes de salvar.
 *
 * Entrada (JSON no corpo):
 *   {
 *     tipoPessoa: "PF" | "PJ",
 *     tipoDocumento: "CNH" | "RG" | "COMPROVANTE_ENDERECO" | "CNPJ" | "CONTRATO_SOCIAL",
 *     arquivoBase64: "<base64 do arquivo>",
 *     mimeType: "image/png" | "image/jpeg" | "application/pdf",
 *     nomeArquivo?: "documento.png"
 *   }
 *
 * Saída: mesmo contrato do CadastroOcrResponse (campos + confidence 0-100 +
 *   camposComBaixaConfianca + avisos + preenchimentoManual + mensagem).
 *
 * Variáveis de ambiente (opcionais):
 *   OCR_LANGUAGE       (default "por")
 *   OCR_MIN_TEXT       (default 40)  — abaixo disso, PDF é tratado como escaneado
 */

const MIMES_ACEITOS = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const MAX_BYTES = 10 * 1024 * 1024;

const DOCS_PF = new Set(['CNH', 'RG']);
const DOCS_PJ = new Set(['CNPJ', 'CONTRATO_SOCIAL']);
const DOCS_VALIDOS = new Set(['CNH', 'RG', 'COMPROVANTE_ENDERECO', 'CNPJ', 'CONTRATO_SOCIAL']);

function fallbackManual(mensagem) {
  return {
    confidence: 0,
    socios: [],
    camposComBaixaConfianca: [],
    avisos: [mensagem],
    preenchimentoManual: true,
    mensagem,
  };
}

// Máximo de páginas a rasterizar+OCR num PDF sem texto (proteção contra o teto de
// 30s da execução síncrona; CNH/RG têm 1 página, contrato social raramente >3).
const MAX_PAGINAS_OCR = 3;

// Cria um worker Tesseract configurado com o idioma local (sem download da CDN).
async function criarWorker(idioma) {
  const { createWorker } = require('tesseract.js');
  // langPath aponta para o idioma local (gzip) e cachePath para /tmp (gravável no
  // runtime); o core WASM já vem do pacote tesseract.js-core, sem download.
  const worker = await createWorker(idioma, 1, {
    langPath: TESSDATA_DIR,
    cachePath: '/tmp',
    gzip: true,
    logger: () => {},
    errorHandler: () => {},
  });
  await worker.setParameters({
    tessedit_pageseg_mode: '3',  // Auto page segmentation (sem OSD, dispensa osd.traineddata)
    preserve_interword_spaces: '1',
  });
  return worker;
}

async function extrairTextoDeImagem(buffer, idioma) {
  const worker = await criarWorker(idioma);
  try {
    const { data } = await worker.recognize(buffer);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

// Rasteriza páginas do PDF em PNG (pdfjs + canvas nativo) e roda OCR.
// É o caminho da CNH/RG digital (gov.br): o documento é uma imagem embutida sem
// texto extraível, então rasterizamos e lemos a imagem.
//   escala       — viewportScale (2x padrão; 4x p/ cartão pequeno embutido)
//   maxPaginas   — limita o nº de páginas (proteção de tempo)
async function ocrDePdfRasterizado(buffer, idioma, log, { escala = 2.0, maxPaginas = MAX_PAGINAS_OCR } = {}) {
  const { pdfToPng } = require('pdf-to-png-converter');
  const paginas = await pdfToPng(buffer, { viewportScale: escala, outputFileMask: 'pg' });
  if (!paginas.length) return null;
  if (paginas.length > maxPaginas) {
    log?.(`PDF com ${paginas.length} páginas — OCR só nas ${maxPaginas} primeiras.`);
  }
  const alvo = paginas.slice(0, maxPaginas);
  const worker = await criarWorker(idioma);
  try {
    const textos = [];
    for (const pg of alvo) {
      const { data } = await worker.recognize(pg.content);
      if (data.text) textos.push(data.text);
    }
    return textos.join('\n').trim() || null;
  } finally {
    await worker.terminate();
  }
}

// Faz OCR do PDF rasterizado e, se a leitura em 2x não achar CPF/CNPJ (caso da CNH
// de motorista, cujo cartão é uma imagem pequena), re-rasteriza a 1ª página em 4x.
// A execução é SÍNCRONA (teto de 30s no Appwrite), então o 4x só dispara se a 1ª
// passada deixou margem de tempo — senão devolve a leitura 2x e evita o timeout.
const ORCAMENTO_MS = Number(process.env.OCR_BUDGET_MS || 28000);  // teto sync ~30s
const MARGEM_4X_MS = Number(process.env.OCR_4X_RESERVA_MS || 16000); // tempo mínimo p/ tentar 4x

async function ocrAdaptativoDePdf(buffer, idioma, tipoPessoa, tipoDocumento, log, inicioMs) {
  const texto2x = await ocrDePdfRasterizado(buffer, idioma, log, { escala: 2.0 });
  if (texto2x) {
    const teste = parseCadastro(texto2x, tipoPessoa, tipoDocumento);
    if (teste.cpf || teste.cnpj) return texto2x;
  }
  const restante = ORCAMENTO_MS - (Date.now() - inicioMs);
  if (restante < MARGEM_4X_MS) {
    log?.(`OCR a 2x sem CPF/CNPJ, mas só restam ${restante}ms — sem margem p/ 4x. Mantendo 2x.`);
    return texto2x || null;
  }
  log?.(`OCR a 2x sem CPF/CNPJ (${restante}ms de folga) — re-rasterizando a 1ª página em 4x.`);
  const texto4x = await ocrDePdfRasterizado(buffer, idioma, log, { escala: 4.0, maxPaginas: 1 });
  if (texto4x) {
    const teste4 = parseCadastro(texto4x, tipoPessoa, tipoDocumento);
    if (teste4.cpf || teste4.cnpj) return texto4x;
  }
  // Devolve a leitura mais "rica" das duas (mais caracteres) p/ o parser tentar.
  return [(texto4x || ''), (texto2x || '')].sort((a, b) => b.length - a.length)[0] || null;
}

async function extrairTextoDePdf(buffer, minTexto, idioma, tipoPessoa, tipoDocumento, log, inicioMs) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  const nativo = (data.text || '').trim();

  // Só confia no texto nativo se ele REALMENTE contiver dados do documento. A
  // CNH/RG digital (gov.br) tem texto nativo, mas é só a página de assinatura
  // (Assinador Serpro/SENATRAN) — muitos caracteres, zero dados aproveitáveis.
  // Critério: o parser encontra CPF/CNPJ ou dá alguma confiança.
  if (nativo.length >= minTexto) {
    const teste = parseCadastro(nativo, tipoPessoa, tipoDocumento);
    if (teste.cpf || teste.cnpj || teste.confidence > 0) {
      log?.(`PDF com texto nativo aproveitável (${nativo.length} chars).`);
      return nativo;
    }
    log?.(`PDF tem ${nativo.length} chars de texto nativo, mas sem dados úteis `
      + `(provável CNH/RG digital — página de assinatura). Rasterizando p/ OCR.`);
  } else {
    log?.(`PDF sem texto nativo (${nativo.length} chars) — rasterizando p/ OCR.`);
  }
  // Texto nativo ausente ou inútil: rasteriza (2x; e 4x adaptativo se faltar CPF).
  return await ocrAdaptativoDePdf(buffer, idioma, tipoPessoa, tipoDocumento, log, inicioMs);
}

module.exports = async ({ req, res, log, error }) => {
  const inicioMs = Date.now();
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { tipoPessoa, tipoDocumento, arquivoBase64, mimeType, nomeArquivo } = corpo;

    // ── Validações de entrada ──
    if (!arquivoBase64) {
      return res.json(fallbackManual('Nenhum arquivo enviado. Preencha manualmente.'), 400);
    }
    if (tipoPessoa !== 'PF' && tipoPessoa !== 'PJ') {
      return res.json({ erro: 'tipoPessoa inválido (PF|PJ).' }, 400);
    }
    if (!DOCS_VALIDOS.has(tipoDocumento)) {
      return res.json({ erro: 'tipoDocumento inválido.' }, 400);
    }
    if (tipoPessoa === 'PF' && DOCS_PJ.has(tipoDocumento)) {
      return res.json({ erro: `Documento ${tipoDocumento} não se aplica a Pessoa Física.` }, 400);
    }
    if (tipoPessoa === 'PJ' && DOCS_PF.has(tipoDocumento)) {
      return res.json({ erro: `Documento ${tipoDocumento} não se aplica a Pessoa Jurídica.` }, 400);
    }

    const mime = (mimeType || '').toLowerCase();
    if (mime && !MIMES_ACEITOS.has(mime)) {
      return res.json({ erro: 'Formato não suportado. Envie PDF, JPG ou PNG.' }, 400);
    }

    const buffer = Buffer.from(arquivoBase64, 'base64');
    if (buffer.length === 0) {
      return res.json(fallbackManual('Arquivo vazio. Preencha manualmente.'), 400);
    }
    if (buffer.length > MAX_BYTES) {
      return res.json({ erro: 'Arquivo excede o limite de 10 MB.' }, 400);
    }

    const idioma = process.env.OCR_LANGUAGE || 'por';
    const minTexto = Number(process.env.OCR_MIN_TEXT || 40);
    const isPdf = mime.includes('pdf') || (nomeArquivo || '').toLowerCase().endsWith('.pdf');

    // ── Extração de texto ──
    let texto;
    try {
      texto = isPdf
        ? await extrairTextoDePdf(buffer, minTexto, idioma, tipoPessoa, tipoDocumento, log, inicioMs)
        : await extrairTextoDeImagem(buffer, idioma);
    } catch (e) {
      error?.(e.message);
      log?.(`Falha no OCR: ${e.message}`);
      return res.json(fallbackManual(
        'Não foi possível processar o documento automaticamente. Preencha manualmente.'));
    }

    if (!texto || !texto.trim()) {
      return res.json(fallbackManual(
        'Não conseguimos ler texto neste documento (ex.: PDF escaneado). '
        + 'Tente uma foto nítida ou preencha manualmente.'));
    }

    log?.(`OCR cadastro: ${texto.length} chars de '${nomeArquivo || 'documento'}' (${tipoDocumento})`);
    log?.(`Texto OCR (até 800 chars): >>> ${texto.substring(0, 800)} <<<`);

    // ── Parsing / validação ──
    const resposta = parseCadastro(texto, tipoPessoa, tipoDocumento);

    // Mesmo após rasterizar+OCR o PDF, não saiu identificador (CPF/CNPJ) nem
    // confiança — provável documento muito ruidoso ou ilegível. Orienta o usuário.
    const semIdentificador = !resposta.cpf && !resposta.cnpj;
    if (isPdf && resposta.confidence === 0 && semIdentificador) {
      log?.('PDF rasterizado mas OCR não extraiu dados úteis — manual.');
      return res.json(fallbackManual(
        'Não conseguimos extrair os dados deste PDF automaticamente. '
        + 'Tente uma foto/print mais nítido do documento — ou preencha manualmente.'));
    }

    resposta.preenchimentoManual = false;
    if (resposta.confidence < 85) {
      resposta.avisos.push('Confiança abaixo de 85% — revise os campos destacados.');
    }
    log?.(`OCR ok: confiança=${resposta.confidence}% revisar=${JSON.stringify(resposta.camposComBaixaConfianca)}`);
    return res.json(resposta);
  } catch (e) {
    error?.(e.message);
    return res.json(fallbackManual('Erro ao processar o documento. Preencha manualmente.'), 500);
  }
};
