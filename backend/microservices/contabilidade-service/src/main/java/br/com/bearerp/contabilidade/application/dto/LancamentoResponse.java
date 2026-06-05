package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data @Builder
public class LancamentoResponse {
    private String id;
    private Long numero;
    private LocalDate dataLancamento;
    private LocalDate dataCompetencia;
    private String tipo;
    private String origemTipo;
    private String historicoPadrao;
    private String historicoComplementar;
    private List<PartidaResponse> partidas;
    private BigDecimal valorTotal;
    private String status;
    private String loteId;
    private Instant createdAt;

    @Data @Builder
    public static class PartidaResponse {
        private String contaId;
        private String contaCodigo;
        private String contaDescricao;
        private String tipo;
        private BigDecimal valor;
        private String historicoPartida;
        private String centroCustoId;
        private String centroCustoNome;
    }
}
