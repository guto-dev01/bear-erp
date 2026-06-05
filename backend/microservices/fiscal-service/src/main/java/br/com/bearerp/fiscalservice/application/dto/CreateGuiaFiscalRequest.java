package br.com.bearerp.fiscalservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CreateGuiaFiscalRequest {
    @NotBlank private String tipoGuia;
    @NotBlank private String competencia;
    @NotNull private LocalDate dataVencimento;
    @NotNull private BigDecimal valorPrincipal;
    private BigDecimal juros;
    private BigDecimal multa;
    private String codigoBarras;
    private String codigoReceita;
    private String numeroDocumento;
    private String observacao;
}
