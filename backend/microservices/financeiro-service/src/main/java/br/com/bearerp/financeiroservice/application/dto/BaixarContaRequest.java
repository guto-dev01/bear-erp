package br.com.bearerp.financeiroservice.application.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BaixarContaRequest {
    @NotNull private LocalDate data;
    @NotNull @Positive private BigDecimal valor;
    private String formaPagamento;
    private String contaBancariaId;
    private String observacao;
}
