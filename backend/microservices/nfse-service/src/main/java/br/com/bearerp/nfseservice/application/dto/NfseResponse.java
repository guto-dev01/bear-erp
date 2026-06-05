package br.com.bearerp.nfseservice.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NfseResponse {
    private String id;
    private Long numero;
    private String codigoVerificacao;
    private String prestadorCnpj;
    private String prestadorRazaoSocial;
    private String tomadorCpfCnpj;
    private String tomadorRazaoSocial;
    private String codigoServico;
    private String descricaoServico;
    private BigDecimal valorServico;
    private BigDecimal baseCalculo;
    private BigDecimal aliquotaIss;
    private BigDecimal valorIss;
    private BigDecimal valorIssRetido;
    private boolean issRetido;
    private BigDecimal valorLiquidoNfse;
    private BigDecimal valorPis;
    private BigDecimal valorCofins;
    private BigDecimal valorInss;
    private BigDecimal valorIr;
    private BigDecimal valorCsll;
    private LocalDateTime dataEmissao;
    private LocalDate competencia;
    private String municipio;
    private String uf;
    private String status;
    private String protocoloAutorizacao;
    private Instant dataAutorizacao;
    private Long numeroRps;
    private String observacao;
}
