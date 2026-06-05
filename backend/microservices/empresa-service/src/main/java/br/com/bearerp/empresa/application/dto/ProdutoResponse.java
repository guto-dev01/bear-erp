package br.com.bearerp.empresa.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ProdutoResponse {
    private String id;
    private String codigo;
    private String descricao;
    private String tipo;
    private String unidade;
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
    private String status;
    private boolean ativo;
}
