package br.com.bearerp.patrimonioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "depreciacoes")
@CompoundIndex(name = "idx_tenant_empresa_bem_competencia", def = "{'tenantId': 1, 'empresaId': 1, 'bemId': 1, 'competencia': 1}")
public class Depreciacao extends BaseDocument {
    private String bemId;
    private String competencia; // YYYY-MM
    private LocalDate dataCalculo;
    private BigDecimal valorDepreciacao;
    private BigDecimal depreciacaoAcumulada;
    private BigDecimal valorResidualAtual;
    private BigDecimal taxaAplicada;
    private int mesVidaUtil; // mês corrente da vida útil
    private boolean contabilizado;
    private String lancamentoContabilId;
}
