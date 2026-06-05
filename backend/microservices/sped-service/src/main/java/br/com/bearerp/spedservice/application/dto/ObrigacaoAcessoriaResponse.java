package br.com.bearerp.spedservice.application.dto;

import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ObrigacaoAcessoriaResponse {
    private String id;
    private String tipo;
    private String competencia;
    private LocalDate prazoEntrega;
    private String status;
    private Instant dataEntrega;
    private String protocoloRecibo;
    private String nomeArquivo;
    private boolean retificacao;
    private String observacao;
}
