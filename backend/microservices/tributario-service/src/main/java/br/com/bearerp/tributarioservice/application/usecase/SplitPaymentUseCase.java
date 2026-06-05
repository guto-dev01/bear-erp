package br.com.bearerp.tributarioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.tributarioservice.application.dto.*;
import br.com.bearerp.tributarioservice.domain.model.SplitPayment;
import br.com.bearerp.tributarioservice.domain.model.SplitPayment.*;
import br.com.bearerp.tributarioservice.domain.repository.SplitPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SplitPaymentUseCase {

    private final SplitPaymentRepository repository;

    // Alíquotas padrão reforma tributária (IBS estadual/municipal + CBS federal)
    private static final BigDecimal DEFAULT_IBS = BigDecimal.valueOf(17.7);
    private static final BigDecimal DEFAULT_CBS = BigDecimal.valueOf(8.8);

    public SplitPaymentResponse simular(CreateSplitPaymentRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        BigDecimal aliquotaIbs = request.getAliquotaIbs() != null ? request.getAliquotaIbs() : DEFAULT_IBS;
        BigDecimal aliquotaCbs = request.getAliquotaCbs() != null ? request.getAliquotaCbs() : DEFAULT_CBS;

        BigDecimal valorIbs = request.getValorTotal().multiply(aliquotaIbs)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal valorCbs = request.getValorTotal().multiply(aliquotaCbs)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal valorLiquido = request.getValorTotal().subtract(valorIbs).subtract(valorCbs);

        SplitPayment sp = SplitPayment.builder()
                .operacaoId(UUID.randomUUID().toString().substring(0, 8))
                .descricao(request.getDescricao())
                .valorTotal(request.getValorTotal())
                .aliquotaIbs(aliquotaIbs).aliquotaCbs(aliquotaCbs)
                .valorIbs(valorIbs).valorCbs(valorCbs).valorLiquido(valorLiquido)
                .status(StatusSplit.SIMULADO)
                .build();
        sp.setTenantId(tenantId);
        sp.setEmpresaId(empresaId);

        sp = repository.save(sp);
        log.info("Split Payment simulado: total={} IBS={} CBS={} líquido={} (tenant: {})",
                sp.getValorTotal(), valorIbs, valorCbs, valorLiquido, tenantId);
        return toResponse(sp);
    }

    public List<SplitPaymentResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return repository.findByTenantIdAndEmpresaId(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    private SplitPaymentResponse toResponse(SplitPayment s) {
        return SplitPaymentResponse.builder()
                .id(s.getId()).operacaoId(s.getOperacaoId()).descricao(s.getDescricao())
                .valorTotal(s.getValorTotal())
                .aliquotaIbs(s.getAliquotaIbs()).aliquotaCbs(s.getAliquotaCbs())
                .valorIbs(s.getValorIbs()).valorCbs(s.getValorCbs()).valorLiquido(s.getValorLiquido())
                .status(s.getStatus() != null ? s.getStatus().name() : null)
                .createdAt(s.getCreatedAt())
                .build();
    }
}
