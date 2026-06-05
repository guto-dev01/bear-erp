package br.com.bearerp.empresa.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class CreateProdutoRequest {
    @NotBlank private String codigo;
    @NotBlank private String descricao;
    @NotNull private String tipo;
    @NotBlank private String unidade;
    private String ncm;
    private String cest;
    private String cfopPadrao;
    private BigDecimal precoVenda;
    private BigDecimal custoMedio;
    private BigDecimal estoqueAtual;
    private BigDecimal estoqueMinimo;
    private String categoria;
    private String marca;
    private String codigoBarras;
    private BigDecimal pesoLiquido;
    private BigDecimal pesoBruto;
    private String origemMercadoria;
}
