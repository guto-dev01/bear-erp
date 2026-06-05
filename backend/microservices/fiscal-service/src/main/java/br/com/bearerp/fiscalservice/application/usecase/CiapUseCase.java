package br.com.bearerp.fiscalservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.fiscalservice.application.dto.CiapResponse;
import br.com.bearerp.fiscalservice.application.dto.CreateCiapRequest;
import br.com.bearerp.fiscalservice.domain.model.Ciap;
import br.com.bearerp.fiscalservice.domain.model.Ciap.StatusCiap;
import br.com.bearerp.fiscalservice.domain.repository.CiapRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CiapUseCase {

    private final CiapRepository ciapRepository;

    public CiapResponse criarCiap(CreateCiapRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        int parcelasTotal = 48;
        BigDecimal valorParcela = request.getIcmsAquisicao().divide(BigDecimal.valueOf(parcelasTotal), 2, RoundingMode.HALF_UP);

        Ciap ciap = Ciap.builder()
                .bemId(request.getBemId())
                .descricao(request.getDescricao())
                .nfeAquisicaoId(request.getNfeAquisicaoId())
                .chaveAcesso(request.getChaveAcesso())
                .dataAquisicao(request.getDataAquisicao())
                .valorAquisicao(request.getValorAquisicao())
                .icmsAquisicao(request.getIcmsAquisicao())
                .parcelasTotal(parcelasTotal)
                .parcelasApropriadas(0)
                .valorParcelaMensal(valorParcela)
                .totalApropriado(BigDecimal.ZERO)
                .saldoApropriar(request.getIcmsAquisicao())
                .status(StatusCiap.EM_APROPRIACAO)
                .build();
        ciap.setTenantId(tenantId);
        ciap.setEmpresaId(empresaId);

        ciap = ciapRepository.save(ciap);
        log.info("CIAP criado para bem {} - ICMS: {} em {} parcelas (tenant: {})", request.getBemId(), request.getIcmsAquisicao(), parcelasTotal, tenantId);
        return toResponse(ciap);
    }

    public CiapResponse apropriarParcela(String id) {
        String tenantId = TenantContext.getTenantId();
        Ciap ciap = ciapRepository.findById(id)
                .orElseThrow(() -> new BusinessException("CIAP_NAO_ENCONTRADO", "CIAP não encontrado"));
        if (!ciap.getTenantId().equals(tenantId)) throw new BusinessException("ACESSO_NEGADO", "Acesso negado");
        if (ciap.getStatus() != StatusCiap.EM_APROPRIACAO) throw new BusinessException("CIAP_CONCLUIDO", "CIAP já concluído ou baixado");

        ciap.setParcelasApropriadas(ciap.getParcelasApropriadas() + 1);
        ciap.setTotalApropriado(ciap.getTotalApropriado().add(ciap.getValorParcelaMensal()));
        ciap.setSaldoApropriar(ciap.getIcmsAquisicao().subtract(ciap.getTotalApropriado()));

        if (ciap.getParcelasApropriadas() >= ciap.getParcelasTotal()) {
            ciap.setStatus(StatusCiap.CONCLUIDO);
            ciap.setSaldoApropriar(BigDecimal.ZERO);
        }

        ciap = ciapRepository.save(ciap);
        log.info("CIAP {} - parcela {}/{} apropriada (tenant: {})", id, ciap.getParcelasApropriadas(), ciap.getParcelasTotal(), tenantId);
        return toResponse(ciap);
    }

    public List<CiapResponse> listar() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return ciapRepository.findByTenantIdAndEmpresaIdOrderByDataAquisicaoDesc(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public List<CiapResponse> listarPorStatus(String status) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return ciapRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, StatusCiap.valueOf(status))
                .stream().map(this::toResponse).toList();
    }

    private CiapResponse toResponse(Ciap c) {
        return CiapResponse.builder()
                .id(c.getId()).bemId(c.getBemId()).descricao(c.getDescricao())
                .nfeAquisicaoId(c.getNfeAquisicaoId()).chaveAcesso(c.getChaveAcesso())
                .dataAquisicao(c.getDataAquisicao()).valorAquisicao(c.getValorAquisicao())
                .icmsAquisicao(c.getIcmsAquisicao()).parcelasTotal(c.getParcelasTotal())
                .parcelasApropriadas(c.getParcelasApropriadas()).valorParcelaMensal(c.getValorParcelaMensal())
                .totalApropriado(c.getTotalApropriado()).saldoApropriar(c.getSaldoApropriar())
                .status(c.getStatus().name())
                .build();
    }
}
