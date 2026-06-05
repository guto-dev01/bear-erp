package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "saldos_contas")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa_ano_mes", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1, 'mes': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_conta_ano_mes", def = "{'tenantId': 1, 'empresaId': 1, 'contaId': 1, 'ano': 1, 'mes': 1}", unique = true),
    @CompoundIndex(name = "idx_tenant_empresa_cc_ano_mes", def = "{'tenantId': 1, 'empresaId': 1, 'centroCustoId': 1, 'ano': 1, 'mes': 1}")
})
public class SaldoConta extends BaseDocument {

    private String contaId;
    private String contaCodigo;
    private String contaDescricao;
    private PlanoContas.Natureza natureza;
    private PlanoContas.Classificacao classificacao;
    private int nivel;
    private int ano;
    private int mes;
    private BigDecimal saldoAnterior;
    private BigDecimal totalDebitos;
    private BigDecimal totalCreditos;
    private BigDecimal saldoAtual;
    private String centroCustoId;
}
