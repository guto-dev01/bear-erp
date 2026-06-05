package br.com.bearerp.contabilidade.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateCentroCustoRequest {
    @NotBlank(message = "Código é obrigatório")
    private String codigo;
    @NotBlank(message = "Descrição é obrigatória")
    private String descricao;
    private String centroPaiId;
    private String tipo;
    private String responsavel;
}
