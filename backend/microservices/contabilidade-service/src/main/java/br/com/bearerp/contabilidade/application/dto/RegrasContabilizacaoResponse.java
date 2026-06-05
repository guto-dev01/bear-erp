package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class RegrasContabilizacaoResponse {
    private String id;
    private String nome;
    private String descricao;
    private String tipoEvento;
    private String contaDebito;
    private String contaCredito;
    private String condicao;
    private String historicoPadrao;
    private boolean ativa;
    private int prioridade;
    private Instant createdAt;
}
