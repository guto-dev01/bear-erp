package br.com.bearerp.fiscalservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CreateEscrituracaoRequest {
    @NotBlank private String tipoEscrituracao;
    private String nfeId;
    private String chaveAcesso;
    private Long numeroNfe;
    private Integer serie;
    private String modeloDocumento;
    @NotBlank private String participanteCnpjCpf;
    private String participanteRazaoSocial;
    private String participanteUf;
    private String participanteIe;
    @NotNull private LocalDateTime dataEmissao;
    private LocalDate dataEntradaSaida;
    @NotBlank private String cfop;
    private String naturezaOperacao;
    @NotNull private BigDecimal valorContabil;
    private BigDecimal baseCalculoIcms;
    private BigDecimal aliquotaIcms;
    private BigDecimal valorIcms;
    private BigDecimal valorIcmsSt;
    private BigDecimal valorIpi;
    private BigDecimal valorPis;
    private BigDecimal valorCofins;
    private BigDecimal outrasDespesas;
    private String codigoSituacao;
    private String observacao;
}
