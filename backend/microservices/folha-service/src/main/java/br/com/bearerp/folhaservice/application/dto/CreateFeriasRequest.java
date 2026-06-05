package br.com.bearerp.folhaservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateFeriasRequest {
    @NotBlank(message = "Funcionário é obrigatório")
    private String funcionarioId;
    private String dataInicio;
    private int diasGozo;
    private int diasAbono;
    private boolean abonoSolicitado;
}
