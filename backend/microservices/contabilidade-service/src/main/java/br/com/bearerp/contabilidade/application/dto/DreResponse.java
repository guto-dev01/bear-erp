package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data @Builder
public class DreResponse {
    private int ano;
    private int mes;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private Instant dataGeracao;
    private List<LinhaDre> linhas;
    private BigDecimal receitaBruta;
    private BigDecimal deducoes;
    private BigDecimal receitaLiquida;
    private BigDecimal custos;
    private BigDecimal lucroBruto;
    private BigDecimal despesasOperacionais;
    private BigDecimal resultadoOperacional;
    private BigDecimal resultadoFinanceiro;
    private BigDecimal resultadoAntesIr;
    private BigDecimal provisaoIrCsll;
    private BigDecimal lucroLiquido;

    @Data @Builder
    public static class LinhaDre {
        private String contaCodigo;
        private String contaDescricao;
        private int nivel;
        private BigDecimal valor;
        private BigDecimal percentual;
    }
}
