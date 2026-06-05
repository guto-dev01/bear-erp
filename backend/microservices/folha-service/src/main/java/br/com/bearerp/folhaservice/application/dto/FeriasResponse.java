package br.com.bearerp.folhaservice.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data @Builder
public class FeriasResponse {
    private String id;
    private String funcionarioId;
    private String funcionarioNome;
    private LocalDate periodoAquisitivoInicio;
    private LocalDate periodoAquisitivoFim;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private int diasGozo;
    private int diasAbono;
    private boolean abonoSolicitado;
    private BigDecimal valorFerias;
    private BigDecimal valorTerco;
    private BigDecimal valorAbono;
    private BigDecimal valorTercoAbono;
    private BigDecimal totalBruto;
    private BigDecimal descontoInss;
    private BigDecimal descontoIrrf;
    private BigDecimal valorLiquido;
    private String status;
    private Instant createdAt;
}
