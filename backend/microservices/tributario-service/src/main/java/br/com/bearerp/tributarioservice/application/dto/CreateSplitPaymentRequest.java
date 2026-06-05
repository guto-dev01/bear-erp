package br.com.bearerp.tributarioservice.application.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter
public class CreateSplitPaymentRequest {
    private String descricao;
    @NotNull(message = "Valor total é obrigatório")
    private BigDecimal valorTotal;
    private BigDecimal aliquotaIbs;
    private BigDecimal aliquotaCbs;
}
