package br.com.bearerp.integracoesservice.infrastructure.ocr;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.integracoesservice.domain.model.OcrDocumento;
import br.com.bearerp.integracoesservice.domain.model.OcrDocumento.StatusOcr;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcrService {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // Patterns para extração de dados de NF-e / documentos fiscais
    private static final Pattern CNPJ_PATTERN = Pattern.compile("\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}");
    private static final Pattern CPF_PATTERN = Pattern.compile("\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}");
    private static final Pattern VALOR_PATTERN = Pattern.compile("(?:R\\$|TOTAL|VALOR)[:\\s]*([\\d.,]+)");
    private static final Pattern DATA_PATTERN = Pattern.compile("(\\d{2}/\\d{2}/\\d{4})");
    private static final Pattern NF_NUMERO_PATTERN = Pattern.compile("(?:N[ºo°]|NUMERO|NF)[:\\s]*(\\d+)");
    private static final Pattern CHAVE_ACESSO_PATTERN = Pattern.compile("\\d{44}");

    public OcrDocumento uploadParaProcessamento(MultipartFile arquivo) {
        OcrDocumento doc = OcrDocumento.builder()
                .nomeArquivo(arquivo.getOriginalFilename())
                .status(StatusOcr.PENDENTE)
                .mimeType(arquivo.getContentType())
                .storagePath("/ocr/" + TenantContext.getTenantId() + "/" + arquivo.getOriginalFilename())
                .confianca(0)
                .lancamentoGerado(false)
                .build();
        doc.setTenantId(TenantContext.getTenantId());
        doc.setEmpresaId(TenantContext.getEmpresaId());

        doc = mongoTemplate.save(doc);
        return doc;
    }

    @Async
    public void processarOcr(String documentoId, byte[] imagemBytes) {
        OcrDocumento doc = mongoTemplate.findById(documentoId, OcrDocumento.class);
        if (doc == null) return;

        doc.setStatus(StatusOcr.PROCESSANDO);
        mongoTemplate.save(doc);

        try {
            // Pipeline OCR: Em produção, integrar com:
            // - Google Cloud Vision API
            // - AWS Textract
            // - Azure Computer Vision
            // - Tesseract OCR (open source)

            // Simulação: Extrair texto usando Tesseract ou API externa
            String textoExtraido = executarOcr(imagemBytes);
            doc.setTextoExtraido(textoExtraido);

            // Extrair dados estruturados do texto
            Map<String, Object> camposExtraidos = extrairDados(textoExtraido);
            doc.setCamposExtraidos(camposExtraidos);

            // Preencher campos tipados
            if (camposExtraidos.containsKey("cnpjEmitente")) {
                doc.setCnpjEmitente((String) camposExtraidos.get("cnpjEmitente"));
            }
            if (camposExtraidos.containsKey("numeroDocumento")) {
                doc.setNumeroDocumento((String) camposExtraidos.get("numeroDocumento"));
            }
            if (camposExtraidos.containsKey("valorTotal")) {
                doc.setValorTotal((BigDecimal) camposExtraidos.get("valorTotal"));
            }
            if (camposExtraidos.containsKey("dataDocumento")) {
                doc.setDataDocumento((LocalDate) camposExtraidos.get("dataDocumento"));
            }

            doc.setTipoDocumento(detectarTipoDocumento(textoExtraido));
            doc.setConfianca(calcularConfianca(camposExtraidos));
            doc.setStatus(StatusOcr.EXTRAIDO);
            doc.setProcessadoEm(Instant.now());

            mongoTemplate.save(doc);

            kafkaTemplate.send("bear.ocr.documento-processado", documentoId, Map.of(
                    "documentoId", documentoId,
                    "tipo", doc.getTipoDocumento(),
                    "confianca", doc.getConfianca(),
                    "valorTotal", doc.getValorTotal() != null ? doc.getValorTotal().toString() : "0"
            ));

            log.info("OCR processado: {} - tipo: {} - confiança: {}%",
                    doc.getNomeArquivo(), doc.getTipoDocumento(), (int)(doc.getConfianca() * 100));

        } catch (Exception e) {
            doc.setStatus(StatusOcr.ERRO);
            doc.setTextoExtraido("Erro: " + e.getMessage());
            mongoTemplate.save(doc);
            log.error("Erro no OCR do documento {}: {}", documentoId, e.getMessage());
        }
    }

    public OcrDocumento validarExtracao(String documentoId, Map<String, Object> correcoesUsuario) {
        OcrDocumento doc = mongoTemplate.findById(documentoId, OcrDocumento.class);
        if (doc == null) throw new RuntimeException("Documento OCR não encontrado");

        if (correcoesUsuario.containsKey("cnpjEmitente"))
            doc.setCnpjEmitente((String) correcoesUsuario.get("cnpjEmitente"));
        if (correcoesUsuario.containsKey("valorTotal"))
            doc.setValorTotal(new BigDecimal(correcoesUsuario.get("valorTotal").toString()));
        if (correcoesUsuario.containsKey("dataDocumento"))
            doc.setDataDocumento(LocalDate.parse(correcoesUsuario.get("dataDocumento").toString()));
        if (correcoesUsuario.containsKey("contaDebito"))
            doc.setContaDebito((String) correcoesUsuario.get("contaDebito"));
        if (correcoesUsuario.containsKey("contaCredito"))
            doc.setContaCredito((String) correcoesUsuario.get("contaCredito"));

        doc.setStatus(StatusOcr.VALIDADO);
        return mongoTemplate.save(doc);
    }

    public OcrDocumento gerarLancamento(String documentoId) {
        OcrDocumento doc = mongoTemplate.findById(documentoId, OcrDocumento.class);
        if (doc == null) throw new RuntimeException("Documento OCR não encontrado");
        if (doc.getStatus() != StatusOcr.VALIDADO) {
            throw new RuntimeException("Documento precisa ser validado antes de gerar lançamento");
        }

        // Enviar para lancamentos-service via Kafka
        kafkaTemplate.send("bear.ocr.gerar-lancamento", documentoId, Map.of(
                "tenantId", doc.getTenantId(),
                "empresaId", doc.getEmpresaId(),
                "contaDebito", doc.getContaDebito() != null ? doc.getContaDebito() : "",
                "contaCredito", doc.getContaCredito() != null ? doc.getContaCredito() : "",
                "valor", doc.getValorTotal().toString(),
                "data", doc.getDataDocumento().toString(),
                "historico", "OCR - " + doc.getTipoDocumento() + " " + doc.getNumeroDocumento(),
                "documento", doc.getNumeroDocumento()
        ));

        doc.setStatus(StatusOcr.LANCADO);
        doc.setLancamentoGerado(true);
        return mongoTemplate.save(doc);
    }

    public List<OcrDocumento> listar() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())),
                OcrDocumento.class);
    }

    private String executarOcr(byte[] imagemBytes) {
        // Em produção: usar Tesseract ou API cloud
        // Retorno simulado para demonstração
        return "NOTA FISCAL ELETRONICA\nCNPJ: 11.222.333/0001-81\nNo: 12345\n" +
               "Data: 15/03/2024\nVALOR TOTAL: R$ 1.500,00\n" +
               "ICMS: R$ 270,00\nPIS: R$ 24,75\nCOFINS: R$ 114,00";
    }

    private Map<String, Object> extrairDados(String texto) {
        Map<String, Object> dados = new LinkedHashMap<>();

        Matcher cnpjMatcher = CNPJ_PATTERN.matcher(texto);
        if (cnpjMatcher.find()) {
            dados.put("cnpjEmitente", cnpjMatcher.group().replaceAll("[^0-9]", ""));
        }

        Matcher nfMatcher = NF_NUMERO_PATTERN.matcher(texto);
        if (nfMatcher.find()) {
            dados.put("numeroDocumento", nfMatcher.group(1));
        }

        Matcher valorMatcher = VALOR_PATTERN.matcher(texto);
        if (valorMatcher.find()) {
            String valorStr = valorMatcher.group(1).replace(".", "").replace(",", ".");
            try {
                dados.put("valorTotal", new BigDecimal(valorStr));
            } catch (NumberFormatException ignored) {}
        }

        Matcher dataMatcher = DATA_PATTERN.matcher(texto);
        if (dataMatcher.find()) {
            try {
                String[] parts = dataMatcher.group(1).split("/");
                dados.put("dataDocumento", LocalDate.of(
                        Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0])));
            } catch (Exception ignored) {}
        }

        Matcher chaveMatcher = CHAVE_ACESSO_PATTERN.matcher(texto);
        if (chaveMatcher.find()) {
            dados.put("chaveAcesso", chaveMatcher.group());
        }

        return dados;
    }

    private String detectarTipoDocumento(String texto) {
        String upper = texto.toUpperCase();
        if (upper.contains("NOTA FISCAL ELETRONICA") || upper.contains("NF-E") || upper.contains("DANFE")) return "NFE";
        if (upper.contains("NOTA FISCAL DE SERVICO") || upper.contains("NFS-E")) return "NFSE";
        if (upper.contains("CUPOM FISCAL") || upper.contains("CF-E")) return "CUPOM";
        if (upper.contains("BOLETO") || upper.contains("FICHA DE COMPENSACAO")) return "BOLETO";
        if (upper.contains("RECIBO")) return "RECIBO";
        if (upper.contains("EXTRATO")) return "EXTRATO";
        return "OUTROS";
    }

    private double calcularConfianca(Map<String, Object> campos) {
        int camposEncontrados = campos.size();
        int camposEsperados = 4; // cnpj, numero, valor, data
        return Math.min(1.0, (double) camposEncontrados / camposEsperados);
    }
}
