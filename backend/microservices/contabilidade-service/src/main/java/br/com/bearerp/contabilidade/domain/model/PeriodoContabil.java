package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "periodos_contabeis")
@CompoundIndex(name = "idx_tenant_empresa_ano_mes", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1, 'mes': 1}", unique = true)
public class PeriodoContabil extends BaseDocument {

    private int ano;
    private int mes;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private StatusPeriodo status;
    private Instant dataFechamento;
    private String usuarioFechamento;
    private String observacao;

    public enum StatusPeriodo { ABERTO, FECHADO, REABERTO }
}
