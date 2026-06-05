package br.com.bearerp.spedservice.application.dto;

import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SpedContabilResponse {
    private String id;
    private int ano;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private String tipoEscrituracao;
    private String status;
    private String hashArquivo;
    private String protocoloRecibo;
    private Instant dataTransmissao;
    private String nomeArquivo;
    private long tamanhoArquivo;
    private int totalRegistros;
}
