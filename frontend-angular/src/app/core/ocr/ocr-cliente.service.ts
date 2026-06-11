import { Injectable } from '@angular/core';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { parseCadastro, type ParseResult, type TipoPessoa, type TipoDocumento } from './parse-cadastro';

// Worker do pdf.js servido como asset local (copiado no build via angular.json).
// Sem CDN/API externa.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.mjs';

export interface OcrResultado extends ParseResult {
  preenchimentoManual: boolean;
  mensagem?: string;
}

const MAX_PAGINAS_OCR = 3;

/**
 * OCR de documentos 100% no navegador (igual ao repositório de referência):
 * pdf.js rasteriza o PDF e tesseract.js lê — sem backend, sem API externa.
 * O texto extraído é estruturado pelo parser local (parse-cadastro).
 */
@Injectable({ providedIn: 'root' })
export class OcrClienteService {
  /** Lê um documento e devolve os campos do cadastro. */
  async extrair(
    file: File,
    tipoPessoa: TipoPessoa,
    tipoDocumento: TipoDocumento,
    onStatus?: (s: string) => void,
  ): Promise<OcrResultado> {
    const ehPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    let texto: string | null;
    try {
      texto = ehPdf
        ? await this.textoDePdf(file, tipoPessoa, tipoDocumento, onStatus)
        : await this.textoDeImagem(file, onStatus);
    } catch (e) {
      return this.manual('Não foi possível processar o documento automaticamente. Preencha manualmente.');
    }

    if (!texto || !texto.trim()) {
      return this.manual(
        'Não conseguimos ler texto neste documento. Tente uma foto/print mais nítido — ou preencha manualmente.');
    }

    onStatus?.('Extraindo dados…');
    const r = parseCadastro(texto, tipoPessoa, tipoDocumento) as OcrResultado;
    if (r.confidence === 0 && !r.cpf && !r.cnpj) {
      return this.manual(
        'Não conseguimos extrair os dados deste documento. Tente uma foto/print mais nítido — ou preencha manualmente.');
    }
    r.preenchimentoManual = false;
    if (r.confidence < 85) r.avisos.push('Confiança abaixo de 85% — revise os campos destacados.');
    return r;
  }

  // ── OCR de imagem ───────────────────────────────────────────
  private async textoDeImagem(file: Blob, onStatus?: (s: string) => void): Promise<string> {
    onStatus?.('Lendo documento…');
    const worker = await this.criarWorker();
    try {
      const { data } = await worker.recognize(file);
      return data.text || '';
    } finally {
      await worker.terminate();
    }
  }

  // ── OCR de PDF: tenta texto nativo; senão rasteriza e OCR ───
  private async textoDePdf(
    file: File, tipoPessoa: TipoPessoa, tipoDocumento: TipoDocumento, onStatus?: (s: string) => void,
  ): Promise<string | null> {
    const buffer = await file.arrayBuffer();
    onStatus?.('Lendo PDF…');
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

    // 1) Texto nativo (PDF "de verdade", não escaneado).
    const nativo = await this.textoNativoDePdf(pdf);
    if (nativo.length >= 40) {
      const teste = parseCadastro(nativo, tipoPessoa, tipoDocumento);
      if (teste.cpf || teste.cnpj || teste.confidence > 0) return nativo;
    }

    // 2) Sem texto útil (CNH/RG digital, escaneado): rasteriza e OCR (2x; e 4x adaptativo).
    const texto2x = await this.ocrPdfRasterizado(pdf, 2.0, MAX_PAGINAS_OCR, onStatus);
    if (texto2x) {
      const t = parseCadastro(texto2x, tipoPessoa, tipoDocumento);
      if (t.cpf || t.cnpj) return texto2x;
    }
    onStatus?.('Lendo em alta resolução…');
    const texto4x = await this.ocrPdfRasterizado(pdf, 4.0, 1, onStatus);
    if (texto4x) {
      const t = parseCadastro(texto4x, tipoPessoa, tipoDocumento);
      if (t.cpf || t.cnpj) return texto4x;
    }
    return [(texto4x || ''), (texto2x || '')].sort((a, b) => b.length - a.length)[0] || null;
  }

  private async textoNativoDePdf(pdf: pdfjsLib.PDFDocumentProxy): Promise<string> {
    const partes: string[] = [];
    const n = Math.min(pdf.numPages, MAX_PAGINAS_OCR);
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const linha = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
      if (linha.trim()) partes.push(linha);
    }
    return partes.join('\n').trim();
  }

  private async ocrPdfRasterizado(
    pdf: pdfjsLib.PDFDocumentProxy, escala: number, maxPaginas: number, onStatus?: (s: string) => void,
  ): Promise<string | null> {
    const worker = await this.criarWorker();
    try {
      const textos: string[] = [];
      const n = Math.min(pdf.numPages, maxPaginas);
      for (let i = 1; i <= n; i++) {
        onStatus?.(`Lendo página ${i}/${n}…`);
        const png = await this.paginaParaImagem(pdf, i, escala);
        const { data } = await worker.recognize(png);
        if (data.text) textos.push(data.text);
      }
      return textos.join('\n').trim() || null;
    } finally {
      await worker.terminate();
    }
  }

  private async paginaParaImagem(pdf: pdfjsLib.PDFDocumentProxy, num: number, escala: number): Promise<Blob> {
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: escala });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponível');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob falhou'))), 'image/png'));
  }

  private async criarWorker(): Promise<Worker> {
    const worker = await createWorker('por');
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    });
    return worker;
  }

  private manual(mensagem: string): OcrResultado {
    return {
      nomeCompleto: null, cpf: null, rg: null, dataNascimento: null, nomeMae: null, nomePai: null,
      cep: null, logradouro: null, numero: null, bairro: null, cidade: null, estado: null,
      cnpj: null, razaoSocial: null, nomeFantasia: null, dataAbertura: null,
      naturezaJuridica: null, cnaePrincipal: null, capitalSocial: null,
      socios: [], confidence: 0, camposComBaixaConfianca: [], avisos: [mensagem],
      preenchimentoManual: true, mensagem,
    };
  }
}
