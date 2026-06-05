package br.com.bearerp.folhaservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "folha_pagamento")
@CompoundIndex(name = "idx_tenant_empresa_competencia", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1, 'mes': 1}", unique = true)
public class FolhaPagamento extends BaseDocument {
    private int ano;
    private int mes;
    private TipoFolha tipo;
    private StatusFolha status;

    // Totais
    private BigDecimal totalProventos;
    private BigDecimal totalDescontos;
    private BigDecimal totalLiquido;
    private BigDecimal totalInss;
    private BigDecimal totalIrrf;
    private BigDecimal totalFgts;
    private BigDecimal totalInssPatronal;
    private BigDecimal totalRat;
    private BigDecimal totalTerceiros;

    private int totalFuncionarios;
    private Instant dataFechamento;
    private String observacao;

    private List<String> holeritesIds;

    public enum TipoFolha { MENSAL, ADIANTAMENTO, DECIMO_TERCEIRO, RESCISAO, FERIAS, COMPLEMENTAR }
    public enum StatusFolha { ABERTA, CALCULADA, FECHADA, REABERTA }
}
