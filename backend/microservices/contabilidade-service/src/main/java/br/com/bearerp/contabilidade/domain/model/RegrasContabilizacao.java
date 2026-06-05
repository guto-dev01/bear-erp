package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "regras_contabilizacao")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_nome", def = "{'tenantId': 1, 'empresaId': 1, 'nome': 1}", unique = true)
})
public class RegrasContabilizacao extends BaseDocument {

    private String nome;
    private String descricao;
    private TipoEvento tipoEvento;
    private String contaDebito;
    private String contaCredito;
    private String condicao;
    private String historicoPadrao;
    private boolean ativa;
    private int prioridade;

    public enum TipoEvento {
        NF_ENTRADA, NF_SAIDA, PAGAMENTO, RECEBIMENTO, FOLHA, DEPRECIACAO, PROVISAO
    }
}
