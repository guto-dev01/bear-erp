package br.com.bearerp.contabilidade.application.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class FecharPeriodoRequest {
    @NotNull private Integer ano;
    @NotNull private Integer mes;
    private String observacao;
}
