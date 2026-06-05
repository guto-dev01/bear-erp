package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.contabilidade.application.dto.FecharPeriodoRequest;
import br.com.bearerp.contabilidade.application.dto.PeriodoContabilResponse;
import br.com.bearerp.contabilidade.domain.model.PeriodoContabil;
import br.com.bearerp.contabilidade.domain.model.PeriodoContabil.StatusPeriodo;
import br.com.bearerp.contabilidade.domain.repository.PeriodoContabilRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PeriodoContabilUseCase {

    private final PeriodoContabilRepository periodoRepository;

    public List<PeriodoContabilResponse> listarPeriodos(int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return periodoRepository.findByTenantIdAndEmpresaIdAndAno(tenantId, empresaId, ano)
                .stream().map(this::toResponse).toList();
    }

    public PeriodoContabilResponse fecharPeriodo(FecharPeriodoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        PeriodoContabil periodo = periodoRepository
                .findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, request.getAno(), request.getMes())
                .orElseGet(() -> criarPeriodo(tenantId, empresaId, request.getAno(), request.getMes()));

        if (periodo.getStatus() == StatusPeriodo.FECHADO) {
            throw new BusinessException("PERIODO_JA_FECHADO", "Período já está fechado");
        }

        periodo.setStatus(StatusPeriodo.FECHADO);
        periodo.setDataFechamento(Instant.now());
        periodo.setObservacao(request.getObservacao());
        periodo = periodoRepository.save(periodo);

        log.info("Período {}/{} fechado (tenant: {})", request.getMes(), request.getAno(), tenantId);
        return toResponse(periodo);
    }

    public PeriodoContabilResponse reabrirPeriodo(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        PeriodoContabil periodo = periodoRepository
                .findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .orElseThrow(() -> new BusinessException("PERIODO_NAO_ENCONTRADO", "Período não encontrado"));

        if (periodo.getStatus() != StatusPeriodo.FECHADO) {
            throw new BusinessException("PERIODO_NAO_FECHADO", "Período não está fechado");
        }

        periodo.setStatus(StatusPeriodo.REABERTO);
        periodo.setDataFechamento(null);
        periodo = periodoRepository.save(periodo);

        log.info("Período {}/{} reaberto (tenant: {})", mes, ano, tenantId);
        return toResponse(periodo);
    }

    public boolean isPeriodoAberto(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return periodoRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .map(p -> p.getStatus() != StatusPeriodo.FECHADO)
                .orElse(true);
    }

    private PeriodoContabil criarPeriodo(String tenantId, String empresaId, int ano, int mes) {
        PeriodoContabil periodo = PeriodoContabil.builder()
                .ano(ano)
                .mes(mes)
                .dataInicio(LocalDate.of(ano, mes, 1))
                .dataFim(LocalDate.of(ano, mes, 1).withDayOfMonth(LocalDate.of(ano, mes, 1).lengthOfMonth()))
                .status(StatusPeriodo.ABERTO)
                .build();
        periodo.setTenantId(tenantId);
        periodo.setEmpresaId(empresaId);
        return periodoRepository.save(periodo);
    }

    private PeriodoContabilResponse toResponse(PeriodoContabil p) {
        return PeriodoContabilResponse.builder()
                .id(p.getId())
                .ano(p.getAno())
                .mes(p.getMes())
                .dataInicio(p.getDataInicio())
                .dataFim(p.getDataFim())
                .status(p.getStatus().name())
                .dataFechamento(p.getDataFechamento())
                .usuarioFechamento(p.getUsuarioFechamento())
                .build();
    }
}
