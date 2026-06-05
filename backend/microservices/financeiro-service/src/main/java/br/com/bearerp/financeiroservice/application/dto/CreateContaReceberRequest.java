package br.com.bearerp.financeiroservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateContaReceberRequest {
    @NotBlank private String descricao;
    @NotBlank private String clienteId;
    private String clienteNome;
    private String clienteCnpjCpf;
    private String categoriaId;
    private String categoria;
    private String centroCustoId;
    private String contaContabilId;
    @NotNull private LocalDate dataEmissao;
    @NotNull private LocalDate dataVencimento;
    private LocalDate dataCompetencia;
    @NotNull @Positive private BigDecimal valorOriginal;
    private BigDecimal valorDesconto;
    private String formaRecebimento;
    private String nfeId;
    private String nfseId;
    private String observacao;
    private int totalParcelas;
    private boolean recorrente;
}
