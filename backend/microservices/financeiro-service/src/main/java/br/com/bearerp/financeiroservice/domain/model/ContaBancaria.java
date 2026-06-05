package br.com.bearerp.financeiroservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "contas_bancarias")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class ContaBancaria extends BaseDocument {
    private String banco;
    private String codigoBanco;
    private String agencia;
    private String conta;
    private String digito;
    private String tipoConta; // CORRENTE, POUPANCA, INVESTIMENTO
    private String descricao;
    private BigDecimal saldoAtual;
    private BigDecimal saldoDisponivel;
    private String contaContabilId;
    private boolean ativa;
    private boolean principal;
}
