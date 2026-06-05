package br.com.bearerp.folhaservice.application.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HoleriteResponse {
    private String id;
    private String funcionarioId;
    private String funcionarioNome;
    private String funcionarioMatricula;
    private String cargo;
    private String departamento;
    private int ano;
    private int mes;
    private BigDecimal salarioBase;
    private List<RubricaDto> proventos;
    private List<RubricaDto> descontos;
    private BigDecimal totalProventos;
    private BigDecimal totalDescontos;
    private BigDecimal salarioLiquido;
    private BigDecimal baseInss;
    private BigDecimal valorInss;
    private BigDecimal baseIrrf;
    private BigDecimal valorIrrf;
    private BigDecimal baseFgts;
    private BigDecimal valorFgts;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RubricaDto {
        private String codigo;
        private String descricao;
        private BigDecimal referencia;
        private BigDecimal valor;
    }
}
