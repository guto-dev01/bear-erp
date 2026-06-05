package br.com.bearerp.obrigacoes.application.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data @Builder
public class ObrigacaoResponse {
    private String id;
    private String nome;
    private String codigo;
    private String tipo;
    private String periodicidade;
    private int diaVencimento;
    private int mesReferencia;
    private int anoReferencia;
    private LocalDate dataVencimento;
    private LocalDate dataEntrega;
    private String status;
    private String responsavel;
    private String observacoes;
    private String protocolo;
    private String recibo;
    private String empresaRazaoSocial;
    private Instant createdAt;
}
