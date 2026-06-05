package br.com.bearerp.tenant.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.tenant.application.dto.AuditLogResponse;
import br.com.bearerp.tenant.domain.model.AuditLog;
import br.com.bearerp.tenant.domain.model.AuditLog.*;
import br.com.bearerp.tenant.domain.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogUseCase {

    private final AuditLogRepository repository;

    public void registrar(String usuario, String acao, String modulo, String descricao, String ip, String detalhes) {
        String tenantId = TenantContext.getTenantId();

        AuditLog auditLog = AuditLog.builder()
                .usuario(usuario)
                .acao(AcaoAudit.valueOf(acao))
                .modulo(modulo)
                .descricao(descricao)
                .ip(ip)
                .detalhes(detalhes)
                .timestamp(Instant.now())
                .build();
        auditLog.setTenantId(tenantId);

        repository.save(auditLog);
        log.debug("Audit log: {} {} {} - {}", usuario, acao, modulo, descricao);
    }

    public Map<String, Object> listar(int page, int size, String usuario, String acao, String modulo) {
        String tenantId = TenantContext.getTenantId();
        Page<AuditLog> resultado = repository.findByTenantIdOrderByTimestampDesc(
                tenantId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp")));

        List<AuditLogResponse> content = resultado.getContent().stream()
                .filter(e -> usuario == null || usuario.isBlank() || e.getUsuario().toLowerCase().contains(usuario.toLowerCase()))
                .filter(e -> acao == null || acao.isBlank() || e.getAcao().name().equals(acao))
                .filter(e -> modulo == null || modulo.isBlank() || e.getModulo().equals(modulo))
                .map(this::toResponse).toList();

        return Map.of("content", content, "totalElements", resultado.getTotalElements(),
                "totalPages", resultado.getTotalPages(), "page", page);
    }

    public long countHoje() {
        String tenantId = TenantContext.getTenantId();
        Instant startOfDay = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        return repository.countByTenantIdAndTimestampAfter(tenantId, startOfDay);
    }

    private AuditLogResponse toResponse(AuditLog a) {
        return AuditLogResponse.builder()
                .id(a.getId()).usuario(a.getUsuario())
                .acao(a.getAcao() != null ? a.getAcao().name() : null)
                .modulo(a.getModulo()).descricao(a.getDescricao())
                .ip(a.getIp()).detalhes(a.getDetalhes())
                .timestamp(a.getTimestamp())
                .build();
    }
}
