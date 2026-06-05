package br.com.bearerp.contabilidade.application.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter @Setter
public class LivroContabilRequest {
    @NotNull(message = "Data início é obrigatória")
    private LocalDate dataInicio;
    @NotNull(message = "Data fim é obrigatória")
    private LocalDate dataFim;
    private String contaId;
}
