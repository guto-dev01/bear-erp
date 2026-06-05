package br.com.bearerp.tenant.domain.repository;

import br.com.bearerp.tenant.domain.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    Page<AuditLog> findByTenantIdOrderByTimestampDesc(String tenantId, Pageable pageable);
    List<AuditLog> findByTenantIdAndUsuario(String tenantId, String usuario);
    List<AuditLog> findByTenantIdAndModulo(String tenantId, String modulo);
    List<AuditLog> findByTenantIdAndAcao(String tenantId, AuditLog.AcaoAudit acao);
    long countByTenantIdAndTimestampAfter(String tenantId, Instant after);
}
