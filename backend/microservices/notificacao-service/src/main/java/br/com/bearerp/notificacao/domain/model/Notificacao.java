package br.com.bearerp.notificacao.domain.model;

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
@Document(collection = "notificacoes")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant", def = "{'tenantId': 1}"),
    @CompoundIndex(name = "idx_tenant_status", def = "{'tenantId': 1, 'status': 1}"),
    @CompoundIndex(name = "idx_tenant_categoria", def = "{'tenantId': 1, 'categoria': 1}")
})
public class Notificacao extends BaseDocument {

    private String destinatarioEmail;
    private String destinatarioNome;
    private TipoNotificacao tipo;
    private CategoriaNotificacao categoria;
    private String assunto;
    private String corpo;
    private String templateName;
    private StatusNotificacao status;
    private int tentativas;
    private String erro;
    private Instant enviadoEm;

    public enum TipoNotificacao { EMAIL, SMS, PUSH, SISTEMA }
    public enum CategoriaNotificacao { FISCAL, FINANCEIRO, FOLHA, SISTEMA, OBRIGACAO, VENCIMENTO }
    public enum StatusNotificacao { PENDENTE, ENVIADA, FALHA, CANCELADA }
}
