package br.com.bearerp.contabilidade.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateRegrasContabilizacaoRequest {
    @NotBlank(message = "Nome é obrigatório")
    private String nome;
    private String descricao;
    @NotBlank(message = "Tipo de evento é obrigatório")
    private String tipoEvento;
    @NotBlank(message = "Conta débito é obrigatória")
    private String contaDebito;
    @NotBlank(message = "Conta crédito é obrigatória")
    private String contaCredito;
    private String condicao;
    private String historicoPadrao;
}
