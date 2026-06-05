package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class CentroCustoResponse {
    private String id;
    private String codigo;
    private String descricao;
    private String centroPaiId;
    private int nivel;
    private String tipo;
    private String status;
    private String responsavel;
    private Instant createdAt;
    private List<CentroCustoResponse> filhos;
}
