package br.com.bearerp.fiscalservice.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ApuracaoPisCofinsResponse {
    private String id;
    private int ano;
    private int mes;
    private String regime;
    private BigDecimal pisDebitoSaidas;
    private BigDecimal pisCreditoEntradas;
    private BigDecimal pisRetidoFonte;
    private BigDecimal pisSaldoCredorAnterior;
    private BigDecimal pisRecolher;
    private BigDecimal pisSaldoCredorTransportar;
    private BigDecimal cofinsDebitoSaidas;
    private BigDecimal cofinsCreditoEntradas;
    private BigDecimal cofinsRetidoFonte;
    private BigDecimal cofinsSaldoCredorAnterior;
    private BigDecimal cofinsRecolher;
    private BigDecimal cofinsSaldoCredorTransportar;
    private String status;
}
