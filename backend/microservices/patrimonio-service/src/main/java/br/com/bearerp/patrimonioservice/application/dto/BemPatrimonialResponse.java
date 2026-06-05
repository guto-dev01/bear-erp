package br.com.bearerp.patrimonioservice.application.dto;

import br.com.bearerp.patrimonioservice.domain.model.BemPatrimonial;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder
public class BemPatrimonialResponse {
    private String id;
    private String codigo;
    private String descricao;
    private String marca;
    private String modelo;
    private String numeroSerie;
    private String notaFiscal;
    private String fornecedorNome;
    private BemPatrimonial.GrupoContabil grupoContabil;
    private String localDescricao;
    private String centroCustoId;
    private String responsavel;
    private LocalDate dataAquisicao;
    private LocalDate dataInicioDepreciacao;
    private LocalDate dataBaixa;
    private BigDecimal valorAquisicao;
    private BigDecimal valorResidual;
    private BigDecimal valorDepreciadoAcumulado;
    private BigDecimal valorAtual;
    private int vidaUtilMeses;
    private BigDecimal taxaDepreciacaoAnual;
    private BemPatrimonial.MetodoDepreciacao metodoDepreciacao;
    private BemPatrimonial.StatusBem status;
    private String observacao;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BemPatrimonialResponse fromEntity(BemPatrimonial e) {
        return BemPatrimonialResponse.builder()
                .id(e.getId()).codigo(e.getCodigo()).descricao(e.getDescricao())
                .marca(e.getMarca()).modelo(e.getModelo()).numeroSerie(e.getNumeroSerie())
                .notaFiscal(e.getNotaFiscal()).fornecedorNome(e.getFornecedorNome())
                .grupoContabil(e.getGrupoContabil()).localDescricao(e.getLocalDescricao())
                .centroCustoId(e.getCentroCustoId()).responsavel(e.getResponsavel())
                .dataAquisicao(e.getDataAquisicao()).dataInicioDepreciacao(e.getDataInicioDepreciacao())
                .dataBaixa(e.getDataBaixa())
                .valorAquisicao(e.getValorAquisicao()).valorResidual(e.getValorResidual())
                .valorDepreciadoAcumulado(e.getValorDepreciadoAcumulado()).valorAtual(e.getValorAtual())
                .vidaUtilMeses(e.getVidaUtilMeses()).taxaDepreciacaoAnual(e.getTaxaDepreciacaoAnual())
                .metodoDepreciacao(e.getMetodoDepreciacao())
                .status(e.getStatus()).observacao(e.getObservacao())
                .createdAt(e.getCreatedAt()).updatedAt(e.getUpdatedAt()).build();
    }
}
