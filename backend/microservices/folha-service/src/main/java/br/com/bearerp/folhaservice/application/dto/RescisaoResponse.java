package br.com.bearerp.folhaservice.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data @Builder
public class RescisaoResponse {
    private String id;
    private String funcionarioId;
    private String funcionarioNome;
    private LocalDate dataDesligamento;
    private LocalDate dataAvisoPrevio;
    private String tipo;
    private BigDecimal saldoSalario;
    private BigDecimal avisoPreviolIndenizado;
    private BigDecimal decimoTerceiroProporcional;
    private BigDecimal feriasVencidas;
    private BigDecimal feriasProporcionais;
    private BigDecimal tercoFerias;
    private BigDecimal multaFgts;
    private BigDecimal saqueFgts;
    private BigDecimal descontoInss;
    private BigDecimal descontoIrrf;
    private BigDecimal outrosDescontos;
    private BigDecimal totalProventos;
    private BigDecimal totalDescontos;
    private BigDecimal valorLiquido;
    private String status;
    private Instant createdAt;
}
