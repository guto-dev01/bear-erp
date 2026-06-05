package br.com.bearerp.folhaservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateRescisaoRequest {
    @NotBlank(message = "Funcionário é obrigatório")
    private String funcionarioId;
    @NotBlank(message = "Data de desligamento é obrigatória")
    private String dataDesligamento;
    @NotBlank(message = "Tipo de rescisão é obrigatório")
    private String tipo;
}
