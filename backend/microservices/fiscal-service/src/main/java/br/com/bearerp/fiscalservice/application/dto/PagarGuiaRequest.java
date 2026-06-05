package br.com.bearerp.fiscalservice.application.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PagarGuiaRequest {
    @NotNull private LocalDate dataPagamento;
    private BigDecimal juros;
    private BigDecimal multa;
}
