package br.com.bearerp.fiscalservice.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ApuracaoIcmsResponse {
    private String id;
    private int ano;
    private int mes;
    private BigDecimal totalDebitosSaidas;
    private BigDecimal outrosDebitos;
    private BigDecimal estornoCreditos;
    private BigDecimal totalDebitos;
    private BigDecimal totalCreditosEntradas;
    private BigDecimal outrosCreditos;
    private BigDecimal estornoDebitos;
    private BigDecimal totalCreditos;
    private BigDecimal saldoCredorAnterior;
    private BigDecimal saldoDevedorApurado;
    private BigDecimal deducoes;
    private BigDecimal icmsRecolher;
    private BigDecimal saldoCredorTransportar;
    private BigDecimal icmsStRecolher;
    private BigDecimal difalRecolher;
    private String status;
    private List<DetalheDto> detalhes;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DetalheDto {
        private String nfeId;
        private String chaveAcesso;
        private Long numeroNfe;
        private String cfop;
        private BigDecimal baseCalculo;
        private BigDecimal aliquota;
        private BigDecimal valorIcms;
        private String tipo;
    }
}
