package br.com.bearerp.empresa.domain.event;

import br.com.bearerp.common.event.DomainEvent;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EmpresaCreatedEvent extends DomainEvent {

    private String razaoSocial;
    private String regimeTributario;

    public EmpresaCreatedEvent(String tenantId, String empresaId, String userId, String razaoSocial, String regime) {
        super("EMPRESA_CREATED", tenantId, empresaId, userId);
        this.razaoSocial = razaoSocial;
        this.regimeTributario = regime;
    }
}
