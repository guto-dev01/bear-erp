package br.com.bearerp.fiscalservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "apuracoes_icms")
@CompoundIndex(name = "idx_tenant_empresa_periodo", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1, 'mes': 1}", unique = true)
public class ApuracaoIcms extends BaseDocument {

    private int ano;
    private int mes;

    // Débitos
    private BigDecimal totalDebitosSaidas;
    private BigDecimal outrosDebitos;
    private BigDecimal estornoCreditos;
    private BigDecimal totalDebitos;

    // Créditos
    private BigDecimal totalCreditosEntradas;
    private BigDecimal outrosCreditos;
    private BigDecimal estornoDebitos;
    private BigDecimal totalCreditos;

    // Apuração
    private BigDecimal saldoCredorAnterior;
    private BigDecimal saldoDevedorApurado;
    private BigDecimal deducoes;
    private BigDecimal icmsRecolher;
    private BigDecimal saldoCredorTransportar;

    // ICMS-ST
    private BigDecimal icmsStRecolher;
    private BigDecimal icmsStCredito;

    // DIFAL
    private BigDecimal difalRecolher;

    // Detalhamento
    private List<DetalheApuracao> detalhes;

    private StatusApuracao status;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DetalheApuracao {
        private String nfeId;
        private String chaveAcesso;
        private Long numeroNfe;
        private String cfop;
        private BigDecimal baseCalculo;
        private BigDecimal aliquota;
        private BigDecimal valorIcms;
        private String tipo; // DEBITO, CREDITO
    }

    public enum StatusApuracao { EM_ABERTO, CALCULADA, FECHADA, RETIFICADA }
}
