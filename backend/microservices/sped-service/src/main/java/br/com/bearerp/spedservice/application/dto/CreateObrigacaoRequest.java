package br.com.bearerp.spedservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CreateObrigacaoRequest {
    @NotBlank private String tipo;
    @NotBlank private String competencia;
    @NotNull private LocalDate prazoEntrega;
    private boolean retificacao;
    private String observacao;
}
