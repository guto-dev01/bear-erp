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
@Document(collection = "centros_custo")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_codigo", def = "{'tenantId': 1, 'empresaId': 1, 'codigo': 1}", unique = true)
})
public class CentroCusto extends BaseDocument {

    private String codigo;
    private String descricao;
    private String centroPaiId;
    private int nivel;
    private TipoCentro tipo;
    private StatusCentro status;
    private String responsavel;

    public enum TipoCentro { SINTETICO, ANALITICO }
    public enum StatusCentro { ATIVO, INATIVO }
}
