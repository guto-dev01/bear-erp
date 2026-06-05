package br.com.bearerp.fiscalservice.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EscrituracaoFiscalResponse {
    private String id;
    private String tipoEscrituracao;
    private String nfeId;
    private String chaveAcesso;
    private Long numeroNfe;
    private Integer serie;
    private String modeloDocumento;
    private String participanteCnpjCpf;
    private String participanteRazaoSocial;
    private String participanteUf;
    private LocalDateTime dataEmissao;
    private LocalDate dataEntradaSaida;
    private String cfop;
    private String naturezaOperacao;
    private BigDecimal valorContabil;
    private BigDecimal baseCalculoIcms;
    private BigDecimal aliquotaIcms;
    private BigDecimal valorIcms;
    private BigDecimal valorIcmsSt;
    private BigDecimal valorIpi;
    private BigDecimal valorPis;
    private BigDecimal valorCofins;
    private String codigoSituacao;
    private int ano;
    private int mes;
}
