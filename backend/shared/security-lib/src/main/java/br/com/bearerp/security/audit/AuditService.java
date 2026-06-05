package br.com.bearerp.security.audit;

import br.com.bearerp.common.domain.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final MongoTemplate mongoTemplate;

    @Async
    public void logAction(String userId, String action, String resource, String resourceId,
                          String ipAddress, Object previousState, Object newState) {
        String previousHash = getLastHash(TenantContext.getTenantId());

        AuditLog auditLog = AuditLog.builder()
                .tenantId(TenantContext.getTenantId())
                .empresaId(TenantContext.getEmpresaId())
                .userId(userId)
                .action(action)
                .resource(resource)
                .resourceId(resourceId)
                .ipAddress(ipAddress)
                .previousState(previousState)
                .newState(newState)
                .timestamp(Instant.now())
                .hashPrevious(previousHash)
                .build();

        String currentHash = computeHash(auditLog, previousHash);
        auditLog.setHashCurrent(currentHash);

        mongoTemplate.save(auditLog);
    }

    private String getLastHash(String tenantId) {
        Query query = new Query(Criteria.where("tenantId").is(tenantId))
                .with(Sort.by(Sort.Direction.DESC, "timestamp"))
                .limit(1);
        AuditLog last = mongoTemplate.findOne(query, AuditLog.class);
        return last != null ? last.getHashCurrent() : "GENESIS";
    }

    private String computeHash(AuditLog log, String previousHash) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String data = previousHash + log.getTenantId() + log.getUserId()
                    + log.getAction() + log.getResource() + log.getTimestamp();
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Erro ao calcular hash de auditoria", e);
        }
    }
}
