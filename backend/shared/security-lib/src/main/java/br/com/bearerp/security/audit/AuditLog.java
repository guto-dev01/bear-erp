package br.com.bearerp.security.audit;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@Builder
@Document(collection = "audit_logs")
@CompoundIndex(name = "idx_tenant_date", def = "{'tenantId': 1, 'timestamp': -1}")
@CompoundIndex(name = "idx_tenant_user", def = "{'tenantId': 1, 'userId': 1}")
public class AuditLog {

    @Id
    private String id;
    private String tenantId;
    private String empresaId;
    private String userId;
    private String action;
    private String resource;
    private String resourceId;
    private String ipAddress;
    private String userAgent;
    private Object previousState;
    private Object newState;
    private Instant timestamp;
    private String hashPrevious;
    private String hashCurrent;
}
