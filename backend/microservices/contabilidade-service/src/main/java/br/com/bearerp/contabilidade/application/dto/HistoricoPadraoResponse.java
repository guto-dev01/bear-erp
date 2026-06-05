package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class HistoricoPadraoResponse {
    private String id;
    private String codigo;
    private String descricao;
    private boolean complementoObrigatorio;
    private String status;
}
