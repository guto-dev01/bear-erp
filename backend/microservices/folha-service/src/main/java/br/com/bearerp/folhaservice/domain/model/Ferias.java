package br.com.bearerp.folhaservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "ferias")
@CompoundIndex(name = "idx_tenant_empresa_func", def = "{'tenantId': 1, 'empresaId': 1, 'funcionarioId': 1}")
public class Ferias extends BaseDocument {
    private String funcionarioId;
    private String funcionarioNome;
    private LocalDate periodoAquisitivoInicio;
    private LocalDate periodoAquisitivoFim;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private int diasGozo;
    private int diasAbono; // abono pecuniário (max 10)
    private boolean abonoSolicitado;
    private BigDecimal valorFerias;
    private BigDecimal valorTerco;
    private BigDecimal valorAbono;
    private BigDecimal valorTercoAbono;
    private BigDecimal totalBruto;
    private BigDecimal descontoInss;
    private BigDecimal descontoIrrf;
    private BigDecimal valorLiquido;
    private StatusFerias status;

    public enum StatusFerias { PROGRAMADA, APROVADA, EM_GOZO, CONCLUIDA, CANCELADA }
}
