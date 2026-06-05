package br.com.bearerp.contabilidade.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter @Setter
public class EstornarLancamentoRequest {
    @NotBlank(message = "Motivo é obrigatório")
    private String motivo;
    private LocalDate dataEstorno;
}
