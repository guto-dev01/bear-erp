package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class ModeloLancamentoResponse {
    private String id;
    private String nome;
    private String descricao;
    private String tipo;
    private String periodicidade;
    private List<PartidaModeloResp> partidas;
    private boolean ativo;
    private Instant createdAt;

    @Data @Builder
    public static class PartidaModeloResp {
        private String contaId;
        private String contaCodigo;
        private String tipo;
        private BigDecimal percentual;
        private BigDecimal valorFixo;
        private String historico;
    }
}
