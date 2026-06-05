package br.com.bearerp.tributarioservice.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder
public class SplitPaymentResponse {
    private String id;
    private String operacaoId;
    private String descricao;
    private BigDecimal valorTotal;
    private BigDecimal aliquotaIbs;
    private BigDecimal aliquotaCbs;
    private BigDecimal valorIbs;
    private BigDecimal valorCbs;
    private BigDecimal valorLiquido;
    private String status;
    private Instant createdAt;
}
