'use strict';

const { parseCadastro } = require('../_shared/ocr/parse-cadastro');

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

async function extrairTextoDeImagem(buffer, idioma) {
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker(idioma, 1, {
    logger: () => {},
    errorHandler: () => {},
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '1',  // Automatic page segmentation with OSD
      preserve_interword_spaces: '1',
    });
    const { data } = await worker.recognize(buffer);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

async function extrairTextoDePdf(buffer, minTexto, idioma) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  const nativo = (data.text || '').trim();
  if (nativo.length >= minTexto) return nativo;
  // PDF escaneado: sem rasterizador nativo no runtime do Appwrite, não dá para
  // aplicar OCR página a página. Sinaliza para preenchimento manual.
  return null;
}

module.exports = async ({ req, res, log, error }) => {
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
        ? await extrairTextoDePdf(buffer, minTexto, idioma)
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

    // PDF cujo texto nativo NÃO contém os dados do documento — caso típico da
    // CNH/RG digital (gov.br), onde a carteira é uma imagem e o único texto
    // extraível é a página de assinatura digital (Assinador Serpro / SENATRAN).
    // Sem rasterizador nativo no runtime, não dá para OCR a imagem embutida.
    // Em vez de devolver um cadastro vazio (confiança 0%), orienta o usuário.
    const semIdentificador = !resposta.cpf && !resposta.cnpj;
    if (isPdf && resposta.confidence === 0 && semIdentificador) {
      log?.('PDF sem dados em texto (provável documento digital com imagem) — manual.');
      return res.json(fallbackManual(
        'Este PDF não traz os dados em texto (provável CNH/RG digital, onde o '
        + 'documento aparece como imagem). Envie uma foto ou print nítido do '
        + 'documento — ou preencha manualmente.'));
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
