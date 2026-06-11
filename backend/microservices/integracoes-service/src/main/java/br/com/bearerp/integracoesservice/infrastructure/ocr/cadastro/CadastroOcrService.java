package br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro;

import br.com.bearerp.integracoesservice.interfaces.rest.dto.CadastroOcrResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

/**
 * Orquestra o OCR de documentos de cadastro:
 * upload → extração de texto (Tess4J/PDFBox) → parsing/validação → resposta JSON.
 *
 * <p>Nunca persiste nada: o usuário precisa revisar e confirmar no frontend antes de salvar.
 * Em caso de falha do motor de OCR, devolve uma resposta com {@code preenchimentoManual=true}
 * para que o frontend libere o formulário manual em vez de quebrar.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CadastroOcrService {

    private static final long MAX_BYTES = 10L * 1024 * 1024; // 10 MB
    private static final Set<String> MIMES_ACEITOS = Set.of(
            "application/pdf", "image/jpeg", "image/jpg", "image/png");

    private final TextExtractor textExtractor;
    private final CadastroDataParser parser;

    public CadastroOcrResponse processar(TipoPessoa tipoPessoa, TipoDocumento tipoDocumento, MultipartFile arquivo) {
        validarArquivo(arquivo);
        validarCompatibilidade(tipoPessoa, tipoDocumento);

        try {
            String texto = textExtractor.extrair(arquivo);
            if (texto == null || texto.isBlank()) {
                return fallbackManual("Não conseguimos ler texto neste documento. "
                        + "Tente uma foto mais nítida ou preencha manualmente.");
            }

            log.debug("OCR cadastro: {} chars extraídos de '{}' ({})",
                    texto.length(), arquivo.getOriginalFilename(), tipoDocumento);

            CadastroOcrResponse resposta = parser.parse(texto, tipoPessoa, tipoDocumento);

            if (resposta.getConfidence() < 85) {
                resposta.addAviso("Confiança abaixo de 85% — revise os campos destacados.");
            }
            log.info("OCR cadastro concluído: tipo={} confiança={}% camposRevisar={}",
                    tipoDocumento, resposta.getConfidence(), resposta.getCamposComBaixaConfianca());
            return resposta;

        } catch (OcrIndisponivelException e) {
            log.warn("OCR indisponível para '{}': {}", arquivo.getOriginalFilename(), e.getMessage());
            return fallbackManual("Não foi possível processar o documento automaticamente. "
                    + "Você pode preencher os dados manualmente.");
        }
    }

    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Arquivo não enviado ou vazio.");
        }
        if (arquivo.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Arquivo excede o limite de 10 MB.");
        }
        String mime = arquivo.getContentType();
        if (mime != null && !MIMES_ACEITOS.contains(mime.toLowerCase())) {
            throw new IllegalArgumentException("Formato não suportado. Envie PDF, JPG ou PNG.");
        }
    }

    private void validarCompatibilidade(TipoPessoa tipoPessoa, TipoDocumento tipoDocumento) {
        boolean docPf = tipoDocumento == TipoDocumento.CNH || tipoDocumento == TipoDocumento.RG;
        boolean docPj = tipoDocumento == TipoDocumento.CNPJ || tipoDocumento == TipoDocumento.CONTRATO_SOCIAL;
        if (tipoPessoa == TipoPessoa.PF && docPj) {
            throw new IllegalArgumentException("Documento " + tipoDocumento + " não se aplica a Pessoa Física.");
        }
        if (tipoPessoa == TipoPessoa.PJ && docPf) {
            throw new IllegalArgumentException("Documento " + tipoDocumento + " não se aplica a Pessoa Jurídica.");
        }
    }

    private CadastroOcrResponse fallbackManual(String mensagem) {
        return CadastroOcrResponse.builder()
                .confidence(0)
                .preenchimentoManual(true)
                .mensagem(mensagem)
                .avisos(List.of(mensagem))
                .build();
    }
}
