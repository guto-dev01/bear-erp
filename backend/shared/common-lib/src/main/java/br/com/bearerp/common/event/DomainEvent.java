package br.com.bearerp.common.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public abstract class DomainEvent {

    private String eventId = UUID.randomUUID().toString();
    private String eventType;
    private String tenantId;
    private String empresaId;
    private String userId;
    private Instant occurredAt = Instant.now();

    protected DomainEvent(String eventType, String tenantId, String empresaId, String userId) {
        this.eventId = UUID.randomUUID().toString();
        this.eventType = eventType;
        this.tenantId = tenantId;
        this.empresaId = empresaId;
        this.userId = userId;
        this.occurredAt = Instant.now();
    }
}
