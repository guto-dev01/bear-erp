package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "historicos_padrao")
@CompoundIndex(name = "idx_tenant_empresa_codigo", def = "{'tenantId': 1, 'empresaId': 1, 'codigo': 1}", unique = true)
public class HistoricoPadrao extends BaseDocument {

    private String codigo;
    private String descricao;
    private boolean complementoObrigatorio;
    private StatusHistorico status;

    public enum StatusHistorico { ATIVO, INATIVO }
}
