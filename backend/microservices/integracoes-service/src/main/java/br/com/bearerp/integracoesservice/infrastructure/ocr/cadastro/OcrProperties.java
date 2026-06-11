package br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configurações do OCR de cadastro (prefixo {@code integracoes.ocr.cadastro}).
 */
@Data
@Component
@ConfigurationProperties(prefix = "integracoes.ocr.cadastro")
public class OcrProperties {

    /** Pasta dos arquivos *.traineddata do Tesseract. Vazio = usa TESSDATA_PREFIX/padrão do sistema. */
    private String tessdataPath = "";

    /** Idioma do Tesseract (ex.: "por" para português). */
    private String language = "por";

    /** DPI ao rasterizar PDFs escaneados antes do OCR. */
    private int pdfRenderDpi = 300;

    /** Abaixo deste tamanho de texto nativo, o PDF é tratado como escaneado (aplica OCR na imagem). */
    private int minNativeTextLength = 40;
}
