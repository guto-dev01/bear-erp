package br.com.bearerp.financeiroservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateContaBancariaRequest {
    @NotBlank private String banco;
    @NotBlank private String codigoBanco;
    @NotBlank private String agencia;
    @NotBlank private String conta;
    private String digito;
    @NotBlank private String tipoConta;
    private String descricao;
    private BigDecimal saldoAtual;
    private String contaContabilId;
    private boolean principal;
}
