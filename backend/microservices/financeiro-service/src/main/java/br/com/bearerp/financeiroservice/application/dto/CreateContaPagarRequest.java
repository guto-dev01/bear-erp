package br.com.bearerp.financeiroservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateContaPagarRequest {
    @NotBlank private String descricao;
    @NotBlank private String fornecedorId;
    private String fornecedorNome;
    private String fornecedorCnpjCpf;
    private String categoriaId;
    private String categoria;
    private String centroCustoId;
    private String contaContabilId;
    @NotNull private LocalDate dataEmissao;
    @NotNull private LocalDate dataVencimento;
    private LocalDate dataCompetencia;
    @NotNull @Positive private BigDecimal valorOriginal;
    private BigDecimal valorDesconto;
    private String formaPagamento;
    private String codigoBarras;
    private String nfeId;
    private String observacao;
    private int totalParcelas;
    private boolean recorrente;
}
