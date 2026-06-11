package br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;

/**
 * Extrai o texto bruto de um documento, escolhendo a estratégia conforme o tipo de arquivo:
 *
 * <ul>
 *   <li><b>Imagem (JPG/PNG)</b>: OCR direto com Tesseract (Tess4J).</li>
 *   <li><b>PDF com texto nativo</b>: leitura via PDFBox {@link PDFTextStripper}.</li>
 *   <li><b>PDF escaneado</b> (pouco/nenhum texto nativo): rasteriza cada página com
 *       {@link PDFRenderer} e aplica OCR.</li>
 * </ul>
 *
 * O Tesseract não é thread-safe, então uma instância nova é criada por chamada.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TextExtractor {

    private final OcrProperties props;

    /**
     * @return o texto extraído (pode ser vazio se o documento não tiver texto reconhecível).
     * @throws OcrIndisponivelException se o motor de OCR não puder ser executado.
     */
    public String extrair(MultipartFile arquivo) {
        String contentType = arquivo.getContentType() == null ? "" : arquivo.getContentType().toLowerCase();
        String nome = arquivo.getOriginalFilename() == null ? "" : arquivo.getOriginalFilename().toLowerCase();
        boolean isPdf = contentType.contains("pdf") || nome.endsWith(".pdf");

        try {
            byte[] bytes = arquivo.getBytes();
            if (bytes.length == 0) {
                throw new OcrIndisponivelException("Arquivo vazio.");
            }
            return isPdf ? extrairDePdf(bytes) : extrairDeImagem(bytes);
        } catch (IOException e) {
            throw new OcrIndisponivelException("Não foi possível ler o arquivo enviado.", e);
        }
    }

    private String extrairDeImagem(byte[] bytes) throws IOException {
        BufferedImage imagem = ImageIO.read(new ByteArrayInputStream(bytes));
        if (imagem == null) {
            throw new OcrIndisponivelException("Formato de imagem não suportado.");
        }
        return ocr(imagem);
    }

    private String extrairDePdf(byte[] bytes) throws IOException {
        try (PDDocument doc = PDDocument.load(bytes)) {
            // 1) Tenta extrair o texto nativo (PDFs gerados digitalmente).
            String nativo = new PDFTextStripper().getText(doc).trim();
            if (nativo.length() >= props.getMinNativeTextLength()) {
                log.debug("PDF com texto nativo ({} chars) — sem OCR.", nativo.length());
                return nativo;
            }

            // 2) PDF escaneado: rasteriza e aplica OCR página a página.
            log.debug("PDF aparentemente escaneado ({} chars nativos) — aplicando OCR.", nativo.length());
            PDFRenderer renderer = new PDFRenderer(doc);
            StringBuilder sb = new StringBuilder(nativo);
            for (int pagina = 0; pagina < doc.getNumberOfPages(); pagina++) {
                BufferedImage imagem = renderer.renderImageWithDPI(pagina, props.getPdfRenderDpi(), ImageType.RGB);
                sb.append('\n').append(ocr(imagem));
            }
            return sb.toString().trim();
        }
    }

    private String ocr(BufferedImage imagem) {
        ITesseract tesseract = novoTesseract();
        try {
            return tesseract.doOCR(imagem);
        } catch (TesseractException e) {
            throw new OcrIndisponivelException("Falha ao executar o OCR (Tesseract).", e);
        } catch (UnsatisfiedLinkError | NoClassDefFoundError e) {
            // Biblioteca nativa do Tesseract não instalada no host.
            throw new OcrIndisponivelException(
                    "Motor de OCR não disponível no servidor (Tesseract não instalado).", e);
        }
    }

    private ITesseract novoTesseract() {
        Tesseract tesseract = new Tesseract();
        if (StringUtils.hasText(props.getTessdataPath())) {
            tesseract.setDatapath(props.getTessdataPath());
        }
        tesseract.setLanguage(props.getLanguage());
        // PSM 3 = segmentação automática de página; OEM 1 = engine LSTM (mais preciso).
        tesseract.setPageSegMode(3);
        tesseract.setOcrEngineMode(1);
        return tesseract;
    }
}
