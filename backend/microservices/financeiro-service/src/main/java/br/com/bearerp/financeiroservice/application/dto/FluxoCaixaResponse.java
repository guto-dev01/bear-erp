package br.com.bearerp.financeiroservice.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data @Builder
public class FluxoCaixaResponse {
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private BigDecimal saldoInicial;
    private BigDecimal totalEntradas;
    private BigDecimal totalSaidas;
    private BigDecimal saldoFinal;
    private List<ItemFluxo> itens;

    @Data @Builder
    public static class ItemFluxo {
        private LocalDate data;
        private String descricao;
        private String tipo; // ENTRADA, SAIDA
        private BigDecimal valor;
        private BigDecimal saldoAcumulado;
        private String origem; // CONTA_PAGAR, CONTA_RECEBER, MOVIMENTO
    }
}
