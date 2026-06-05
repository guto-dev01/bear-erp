package br.com.bearerp.tributarioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "split_payment")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class SplitPayment extends BaseDocument {

    private String operacaoId;
    private String descricao;
    private BigDecimal valorTotal;
    private BigDecimal aliquotaIbs;
    private BigDecimal aliquotaCbs;
    private BigDecimal valorIbs;
    private BigDecimal valorCbs;
    private BigDecimal valorLiquido;
    private StatusSplit status;

    public enum StatusSplit { SIMULADO, CONFIRMADO, CANCELADO }
}
