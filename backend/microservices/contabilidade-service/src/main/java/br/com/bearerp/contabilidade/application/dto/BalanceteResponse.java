package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class BalanceteResponse {
    private int ano;
    private int mes;
    private Instant dataGeracao;
    private List<LinhaBalancete> contas;
    private BigDecimal totalDebitos;
    private BigDecimal totalCreditos;

    @Data @Builder
    public static class LinhaBalancete {
        private String contaCodigo;
        private String contaDescricao;
        private String natureza;
        private String classificacao;
        private int nivel;
        private BigDecimal saldoAnterior;
        private BigDecimal debitos;
        private BigDecimal creditos;
        private BigDecimal saldoAtual;
    }
}
