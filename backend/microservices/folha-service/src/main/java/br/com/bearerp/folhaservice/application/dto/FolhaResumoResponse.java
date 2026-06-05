package br.com.bearerp.folhaservice.application.dto;

import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FolhaResumoResponse {
    private String id;
    private int ano;
    private int mes;
    private String tipo;
    private String status;
    private BigDecimal totalProventos;
    private BigDecimal totalDescontos;
    private BigDecimal totalLiquido;
    private BigDecimal totalInss;
    private BigDecimal totalIrrf;
    private BigDecimal totalFgts;
    private BigDecimal totalInssPatronal;
    private int totalFuncionarios;
}
