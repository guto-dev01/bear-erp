package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.time.LocalDate;

@Data @Builder
public class PeriodoContabilResponse {
    private String id;
    private int ano;
    private int mes;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private String status;
    private Instant dataFechamento;
    private String usuarioFechamento;
}
