package br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro;

/**
 * Lançada quando o motor de OCR não pôde ser executado (Tesseract ausente, biblioteca
 * nativa não carregada, arquivo ilegível). Sinaliza ao controller que o frontend deve
 * cair para preenchimento manual em vez de tratar como erro fatal.
 */
public class OcrIndisponivelException extends RuntimeException {
    public OcrIndisponivelException(String message, Throwable cause) {
        super(message, cause);
    }

    public OcrIndisponivelException(String message) {
        super(message);
    }
}
