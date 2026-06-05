package br.com.bearerp.tenant.domain.event;

import br.com.bearerp.common.event.DomainEvent;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TenantCreatedEvent extends DomainEvent {

    private String nome;
    private String cnpj;
    private String plano;

    public TenantCreatedEvent(String tenantId, String userId, String nome, String cnpj, String plano) {
        super("TENANT_CREATED", tenantId, null, userId);
        this.nome = nome;
        this.cnpj = cnpj;
        this.plano = plano;
    }
}
