package br.com.bearerp.patrimonioservice.application.dto;

import br.com.bearerp.patrimonioservice.domain.model.BemPatrimonial;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateBemRequest {
    @NotBlank private String descricao;
    private String marca;
    private String modelo;
    private String numeroSerie;
    private String notaFiscal;
    private String fornecedorId;
    private String fornecedorNome;
    @NotNull private BemPatrimonial.GrupoContabil grupoContabil;
    private String localId;
    private String localDescricao;
    private String centroCustoId;
    private String responsavel;
    @NotNull private LocalDate dataAquisicao;
    private LocalDate dataInicioDepreciacao;
    @NotNull @Positive private BigDecimal valorAquisicao;
    private BigDecimal valorResidual;
    @Positive private int vidaUtilMeses;
    private BigDecimal taxaDepreciacaoAnual;
    private BemPatrimonial.MetodoDepreciacao metodoDepreciacao;
    private String contaContabilAtivoId;
    private String contaContabilDepreciacaoId;
    private String contaContabilDespesaId;
    private String observacao;
}
