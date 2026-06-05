package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data @Builder
public class ExercicioContabilResponse {
    private String id;
    private int ano;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private String status;
    private Instant dataEncerramento;
    private boolean saldoInicialGerado;
    private BigDecimal lucroOuPrejuizo;
}
