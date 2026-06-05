package br.com.bearerp.spedservice.application.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SpedFiscalResponse {
    private String id;
    private int ano;
    private int mes;
    private String perfil;
    private String finalidade;
    private String tipo;
    private String status;
    private String hashArquivo;
    private String protocoloRecibo;
    private Instant dataTransmissao;
    private String nomeArquivo;
    private long tamanhoArquivo;
    private int totalRegistros;
}
