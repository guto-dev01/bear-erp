package br.com.bearerp.integracoesservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "ocr_documentos")
public class OcrDocumento extends BaseDocument {

    private String nomeArquivo;
    private String tipoDocumento; // NFE, NFSE, CUPOM, RECIBO, BOLETO, EXTRATO
    private StatusOcr status;

    // Dados extraídos
    private String cnpjEmitente;
    private String razaoSocialEmitente;
    private String cnpjDestinatario;
    private String numeroDocumento;
    private LocalDate dataDocumento;
    private BigDecimal valorTotal;
    private BigDecimal valorIcms;
    private BigDecimal valorIss;
    private BigDecimal valorPis;
    private BigDecimal valorCofins;

    // Dados brutos do OCR
    private String textoExtraido;
    private double confianca; // 0.0 a 1.0
    private Map<String, Object> camposExtraidos;

    // Lançamento gerado
    private String lancamentoContabilId;
    private String contaDebito;
    private String contaCredito;
    private boolean lancamentoGerado;

    // Controle
    private Instant processadoEm;
    private String storagePath;
    private String mimeType;

    public enum StatusOcr {
        PENDENTE, PROCESSANDO, EXTRAIDO, VALIDADO, LANCADO, ERRO
    }
}
