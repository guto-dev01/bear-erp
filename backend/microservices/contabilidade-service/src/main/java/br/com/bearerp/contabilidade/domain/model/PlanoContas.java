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
@Document(collection = "plano_contas")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_codigo", def = "{'tenantId': 1, 'empresaId': 1, 'codigo': 1}", unique = true),
    @CompoundIndex(name = "idx_tenant_empresa_classificacao", def = "{'tenantId': 1, 'empresaId': 1, 'classificacao': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_pai", def = "{'tenantId': 1, 'empresaId': 1, 'contaPaiId': 1}")
})
public class PlanoContas extends BaseDocument {

    private String codigo;
    private String descricao;
    private Natureza natureza;
    private TipoConta tipo;
    private Classificacao classificacao;
    private int nivel;
    private String contaPaiId;
    private boolean aceitaLancamento;
    private String contaReferencial;
    private StatusConta status;
    private int ordem;

    public enum Natureza { DEVEDORA, CREDORA }
    public enum TipoConta { SINTETICA, ANALITICA }
    public enum Classificacao { ATIVO, PASSIVO, PATRIMONIO_LIQUIDO, RECEITA, DESPESA, CUSTO }
    public enum StatusConta { ATIVA, INATIVA }
}
