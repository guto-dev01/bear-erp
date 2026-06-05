package br.com.bearerp.fiscalservice.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GuiaFiscalResponse {
    private String id;
    private String tipoGuia;
    private String competencia;
    private LocalDate dataVencimento;
    private LocalDate dataPagamento;
    private BigDecimal valorPrincipal;
    private BigDecimal juros;
    private BigDecimal multa;
    private BigDecimal valorTotal;
    private String codigoBarras;
    private String codigoReceita;
    private String numeroDocumento;
    private String status;
    private String observacao;
}
