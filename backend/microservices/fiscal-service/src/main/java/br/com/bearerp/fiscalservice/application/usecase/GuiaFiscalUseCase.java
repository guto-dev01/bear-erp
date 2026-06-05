package br.com.bearerp.fiscalservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.fiscalservice.application.dto.CreateGuiaFiscalRequest;
import br.com.bearerp.fiscalservice.application.dto.GuiaFiscalResponse;
import br.com.bearerp.fiscalservice.application.dto.PagarGuiaRequest;
import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal;
import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal.StatusGuia;
import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal.TipoGuia;
import br.com.bearerp.fiscalservice.domain.repository.GuiaFiscalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GuiaFiscalUseCase {

    private final GuiaFiscalRepository guiaRepository;

    public GuiaFiscalResponse criarGuia(CreateGuiaFiscalRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        BigDecimal juros = request.getJuros() != null ? request.getJuros() : BigDecimal.ZERO;
        BigDecimal multa = request.getMulta() != null ? request.getMulta() : BigDecimal.ZERO;
        BigDecimal valorTotal = request.getValorPrincipal().add(juros).add(multa);

        GuiaFiscal guia = GuiaFiscal.builder()
                .tipoGuia(TipoGuia.valueOf(request.getTipoGuia()))
                .competencia(request.getCompetencia())
                .dataVencimento(request.getDataVencimento())
                .valorPrincipal(request.getValorPrincipal())
                .juros(juros).multa(multa).valorTotal(valorTotal)
                .codigoBarras(request.getCodigoBarras())
                .codigoReceita(request.getCodigoReceita())
                .numeroDocumento(request.getNumeroDocumento())
                .observacao(request.getObservacao())
                .status(StatusGuia.GERADA)
                .build();
        guia.setTenantId(tenantId);
        guia.setEmpresaId(empresaId);

        guia = guiaRepository.save(guia);
        log.info("Guia {} criada - competência {} valor {} (tenant: {})", request.getTipoGuia(), request.getCompetencia(), valorTotal, tenantId);
        return toResponse(guia);
    }

    public GuiaFiscalResponse pagarGuia(String id, PagarGuiaRequest request) {
        String tenantId = TenantContext.getTenantId();
        GuiaFiscal guia = guiaRepository.findById(id)
                .orElseThrow(() -> new BusinessException("GUIA_NAO_ENCONTRADA", "Guia não encontrada"));
        if (!guia.getTenantId().equals(tenantId)) throw new BusinessException("ACESSO_NEGADO", "Acesso negado");
        if (guia.getStatus() == StatusGuia.PAGA) throw new BusinessException("GUIA_JA_PAGA", "Guia já está paga");

        guia.setDataPagamento(request.getDataPagamento());
        if (request.getJuros() != null) guia.setJuros(request.getJuros());
        if (request.getMulta() != null) guia.setMulta(request.getMulta());
        guia.setValorTotal(guia.getValorPrincipal().add(guia.getJuros()).add(guia.getMulta()));
        guia.setStatus(StatusGuia.PAGA);

        guia = guiaRepository.save(guia);
        log.info("Guia {} paga em {} (tenant: {})", id, request.getDataPagamento(), tenantId);
        return toResponse(guia);
    }

    public GuiaFiscalResponse cancelarGuia(String id) {
        String tenantId = TenantContext.getTenantId();
        GuiaFiscal guia = guiaRepository.findById(id)
                .orElseThrow(() -> new BusinessException("GUIA_NAO_ENCONTRADA", "Guia não encontrada"));
        if (!guia.getTenantId().equals(tenantId)) throw new BusinessException("ACESSO_NEGADO", "Acesso negado");
        guia.setStatus(StatusGuia.CANCELADA);
        guia = guiaRepository.save(guia);
        return toResponse(guia);
    }

    public List<GuiaFiscalResponse> listarPorCompetencia(String competencia) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return guiaRepository.findByTenantIdAndEmpresaIdAndCompetenciaOrderByDataVencimentoAsc(tenantId, empresaId, competencia)
                .stream().map(this::toResponse).toList();
    }

    public List<GuiaFiscalResponse> listarPorTipo(String tipo) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return guiaRepository.findByTenantIdAndEmpresaIdAndTipoGuia(tenantId, empresaId, TipoGuia.valueOf(tipo))
                .stream().map(this::toResponse).toList();
    }

    public List<GuiaFiscalResponse> listarVencidas() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        // Atualizar status de guias vencidas
        List<GuiaFiscal> geradas = guiaRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, StatusGuia.GERADA);
        LocalDate hoje = LocalDate.now();
        for (GuiaFiscal g : geradas) {
            if (g.getDataVencimento().isBefore(hoje)) {
                g.setStatus(StatusGuia.VENCIDA);
                guiaRepository.save(g);
            }
        }
        return guiaRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, StatusGuia.VENCIDA)
                .stream().map(this::toResponse).toList();
    }

    public List<GuiaFiscalResponse> listarPorVencimento(LocalDate inicio, LocalDate fim) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return guiaRepository.findByTenantIdAndEmpresaIdAndDataVencimentoBetween(tenantId, empresaId, inicio, fim)
                .stream().map(this::toResponse).toList();
    }

    private GuiaFiscalResponse toResponse(GuiaFiscal g) {
        return GuiaFiscalResponse.builder()
                .id(g.getId()).tipoGuia(g.getTipoGuia().name())
                .competencia(g.getCompetencia()).dataVencimento(g.getDataVencimento())
                .dataPagamento(g.getDataPagamento()).valorPrincipal(g.getValorPrincipal())
                .juros(g.getJuros()).multa(g.getMulta()).valorTotal(g.getValorTotal())
                .codigoBarras(g.getCodigoBarras()).codigoReceita(g.getCodigoReceita())
                .numeroDocumento(g.getNumeroDocumento()).status(g.getStatus().name())
                .observacao(g.getObservacao())
                .build();
    }
}
