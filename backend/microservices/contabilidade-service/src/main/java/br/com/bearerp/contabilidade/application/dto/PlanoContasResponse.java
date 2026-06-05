package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class PlanoContasResponse {
    private String id;
    private String codigo;
    private String descricao;
    private String natureza;
    private String tipo;
    private String classificacao;
    private int nivel;
    private String contaPaiId;
    private boolean aceitaLancamento;
    private String contaReferencial;
    private String status;
    private Instant createdAt;
    private List<PlanoContasResponse> filhos;
}
