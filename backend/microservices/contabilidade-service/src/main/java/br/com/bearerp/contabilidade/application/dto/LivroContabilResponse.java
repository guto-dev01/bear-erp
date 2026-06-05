package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.time.LocalDate;

@Data @Builder
public class LivroContabilResponse {
    private String id;
    private String tipo;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private int totalPaginas;
    private int totalLancamentos;
    private String hashVerificacao;
    private String status;
    private Instant dataGeracao;
}
