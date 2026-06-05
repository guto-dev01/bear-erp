package br.com.bearerp.cte.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Data @Builder
public class CteResponse {
    private String id;
    private Long numero;
    private int serie;
    private String chave;
    private String tipoCte;
    private String modal;
    private String naturezaOperacao;

    private String remetenteNome;
    private String remetenteCnpjCpf;
    private String destinatarioNome;
    private String destinatarioCnpjCpf;

    private BigDecimal valorTotalServico;
    private BigDecimal valorCarga;
    private String produtoPredominante;

    private BigDecimal icmsBase;
    private BigDecimal icmsAliquota;
    private BigDecimal icmsValor;

    private LocalDateTime dataEmissao;
    private String status;
    private String protocolo;
    private Instant createdAt;
}
