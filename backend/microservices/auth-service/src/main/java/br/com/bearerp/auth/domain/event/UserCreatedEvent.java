package br.com.bearerp.auth.domain.event;

import br.com.bearerp.common.event.DomainEvent;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserCreatedEvent extends DomainEvent {

    private String email;
    private String nome;

    public UserCreatedEvent(String tenantId, String empresaId, String userId, String email, String nome) {
        super("USER_CREATED", tenantId, empresaId, userId);
        this.email = email;
        this.nome = nome;
    }
}
