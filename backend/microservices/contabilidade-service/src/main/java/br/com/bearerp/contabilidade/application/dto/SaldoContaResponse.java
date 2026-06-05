package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data @Builder
public class SaldoContaResponse {
    private String contaId;
    private String contaCodigo;
    private String contaDescricao;
    private String natureza;
    private int ano;
    private int mes;
    private BigDecimal saldoAnterior;
    private BigDecimal totalDebitos;
    private BigDecimal totalCreditos;
    private BigDecimal saldoAtual;
    private String centroCustoId;
}
