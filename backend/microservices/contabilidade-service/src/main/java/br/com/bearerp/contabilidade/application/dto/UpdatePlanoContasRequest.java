package br.com.bearerp.contabilidade.application.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdatePlanoContasRequest {
    private String descricao;
    private String contaReferencial;
    private String status;
    private Boolean aceitaLancamento;
}
