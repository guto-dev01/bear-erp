package br.com.bearerp.fiscalservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CreateCiapRequest {
    @NotBlank private String bemId;
    @NotBlank private String descricao;
    private String nfeAquisicaoId;
    private String chaveAcesso;
    @NotNull private LocalDate dataAquisicao;
    @NotNull private BigDecimal valorAquisicao;
    @NotNull private BigDecimal icmsAquisicao;
}
