package br.com.bearerp.fiscalservice.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CiapResponse {
    private String id;
    private String bemId;
    private String descricao;
    private String nfeAquisicaoId;
    private String chaveAcesso;
    private LocalDate dataAquisicao;
    private BigDecimal valorAquisicao;
    private BigDecimal icmsAquisicao;
    private int parcelasTotal;
    private int parcelasApropriadas;
    private BigDecimal valorParcelaMensal;
    private BigDecimal totalApropriado;
    private BigDecimal saldoApropriar;
    private String status;
}
