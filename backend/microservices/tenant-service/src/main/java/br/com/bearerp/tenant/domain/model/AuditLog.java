package br.com.bearerp.tenant.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "audit_logs")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant", def = "{'tenantId': 1}"),
    @CompoundIndex(name = "idx_tenant_usuario", def = "{'tenantId': 1, 'usuario': 1}"),
    @CompoundIndex(name = "idx_tenant_modulo", def = "{'tenantId': 1, 'modulo': 1}"),
    @CompoundIndex(name = "idx_tenant_timestamp", def = "{'tenantId': 1, 'timestamp': -1}")
})
public class AuditLog extends BaseDocument {

    private String usuario;
    private AcaoAudit acao;
    private String modulo;
    private String descricao;
    private String ip;
    private String detalhes;
    private Instant timestamp;

    public enum AcaoAudit { CRIAR, EDITAR, EXCLUIR, LOGIN, LOGOUT, EXPORTAR }
}
