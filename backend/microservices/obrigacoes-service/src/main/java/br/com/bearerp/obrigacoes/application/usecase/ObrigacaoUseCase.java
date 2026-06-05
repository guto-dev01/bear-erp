package br.com.bearerp.obrigacoes.application.usecase;

import br.com.bearerp.obrigacoes.application.dto.*;
import br.com.bearerp.obrigacoes.domain.model.ObrigacaoAcessoria;
import br.com.bearerp.obrigacoes.domain.model.ObrigacaoAcessoria.*;
import br.com.bearerp.obrigacoes.domain.repository.ObrigacaoAcessoriaRepository;
import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ObrigacaoUseCase {

    private final ObrigacaoAcessoriaRepository repository;

    public ObrigacaoResponse create(CreateObrigacaoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (repository.existsByTenantIdAndEmpresaIdAndCodigoAndMesReferenciaAndAnoReferencia(
                tenantId, empresaId, request.getCodigo(), request.getMesReferencia(), request.getAnoReferencia())) {
            throw new BusinessException("OBRIGACAO_EXISTS", "Obrigação já existe para esta competência");
        }

        LocalDate vencimento = LocalDate.of(request.getAnoReferencia(), request.getMesReferencia(), Math.min(request.getDiaVencimento(), 28));

        ObrigacaoAcessoria ob = ObrigacaoAcessoria.builder()
                .nome(request.getNome()).codigo(request.getCodigo())
                .tipo(TipoObrigacao.valueOf(request.getTipo()))
                .periodicidade(request.getPeriodicidade() != null ? Periodicidade.valueOf(request.getPeriodicidade()) : Periodicidade.MENSAL)
                .diaVencimento(request.getDiaVencimento())
                .mesReferencia(request.getMesReferencia()).anoReferencia(request.getAnoReferencia())
                .dataVencimento(vencimento)
                .responsavel(request.getResponsavel()).observacoes(request.getObservacoes())
                .status(StatusObrigacao.PENDENTE)
                .build();
        ob.setTenantId(tenantId);
        ob.setEmpresaId(empresaId);

        ob = repository.save(ob);
        log.info("Obrigação criada: {} competência {}/{} (tenant: {})", ob.getCodigo(), ob.getMesReferencia(), ob.getAnoReferencia(), tenantId);
        return toResponse(ob);
    }

    public List<ObrigacaoResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return repository.findByTenantIdAndEmpresaId(tenantId, empresaId).stream().map(this::toResponse).toList();
    }

    public List<ObrigacaoResponse> listarPorCompetencia(int mes, int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return repository.findByTenantIdAndEmpresaIdAndMesReferenciaAndAnoReferencia(tenantId, empresaId, mes, ano)
                .stream().map(this::toResponse).toList();
    }

    public List<ObrigacaoResponse> listarPendentes() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return repository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, StatusObrigacao.PENDENTE)
                .stream().map(this::toResponse).toList();
    }

    public ObrigacaoResponse marcarEntregue(String id, String protocolo) {
        ObrigacaoAcessoria ob = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Obrigação", id));
        ob.setStatus(StatusObrigacao.ENTREGUE);
        ob.setDataEntrega(LocalDate.now());
        ob.setProtocolo(protocolo);
        ob = repository.save(ob);
        return toResponse(ob);
    }

    public List<ObrigacaoResponse> gerarCalendarioMensal(int mes, int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        // Templates de obrigações padrão brasileiras
        List<Map<String, Object>> templates = List.of(
            Map.of("nome", "DCTF", "codigo", "DCTF", "tipo", "FEDERAL", "dia", 15),
            Map.of("nome", "EFD Contribuições", "codigo", "EFD_CONTRIB", "tipo", "FEDERAL", "dia", 10),
            Map.of("nome", "EFD ICMS/IPI", "codigo", "EFD_ICMSIPI", "tipo", "ESTADUAL", "dia", 20),
            Map.of("nome", "GIA", "codigo", "GIA", "tipo", "ESTADUAL", "dia", 15),
            Map.of("nome", "DAS (Simples)", "codigo", "DAS", "tipo", "FEDERAL", "dia", 20),
            Map.of("nome", "GFIP/SEFIP", "codigo", "GFIP", "tipo", "FEDERAL", "dia", 7),
            Map.of("nome", "CAGED", "codigo", "CAGED", "tipo", "FEDERAL", "dia", 7),
            Map.of("nome", "RAIS", "codigo", "RAIS", "tipo", "FEDERAL", "dia", 28),
            Map.of("nome", "DIRF", "codigo", "DIRF", "tipo", "FEDERAL", "dia", 28),
            Map.of("nome", "ISS (Serviços)", "codigo", "ISS", "tipo", "MUNICIPAL", "dia", 10)
        );

        List<ObrigacaoAcessoria> criadas = new ArrayList<>();
        for (Map<String, Object> t : templates) {
            String codigo = (String) t.get("codigo");
            if (!repository.existsByTenantIdAndEmpresaIdAndCodigoAndMesReferenciaAndAnoReferencia(tenantId, empresaId, codigo, mes, ano)) {
                int dia = (int) t.get("dia");
                ObrigacaoAcessoria ob = ObrigacaoAcessoria.builder()
                        .nome((String) t.get("nome")).codigo(codigo)
                        .tipo(TipoObrigacao.valueOf((String) t.get("tipo")))
                        .periodicidade(Periodicidade.MENSAL)
                        .diaVencimento(dia).mesReferencia(mes).anoReferencia(ano)
                        .dataVencimento(LocalDate.of(ano, mes, Math.min(dia, 28)))
                        .status(StatusObrigacao.PENDENTE)
                        .build();
                ob.setTenantId(tenantId);
                ob.setEmpresaId(empresaId);
                criadas.add(repository.save(ob));
            }
        }
        log.info("Calendário gerado: {} obrigações para {}/{}", criadas.size(), mes, ano);
        return criadas.stream().map(this::toResponse).toList();
    }

    private ObrigacaoResponse toResponse(ObrigacaoAcessoria o) {
        return ObrigacaoResponse.builder()
                .id(o.getId()).nome(o.getNome()).codigo(o.getCodigo())
                .tipo(o.getTipo() != null ? o.getTipo().name() : null)
                .periodicidade(o.getPeriodicidade() != null ? o.getPeriodicidade().name() : null)
                .diaVencimento(o.getDiaVencimento())
                .mesReferencia(o.getMesReferencia()).anoReferencia(o.getAnoReferencia())
                .dataVencimento(o.getDataVencimento()).dataEntrega(o.getDataEntrega())
                .status(o.getStatus() != null ? o.getStatus().name() : null)
                .responsavel(o.getResponsavel()).observacoes(o.getObservacoes())
                .protocolo(o.getProtocolo()).recibo(o.getRecibo())
                .empresaRazaoSocial(o.getEmpresaRazaoSocial()).createdAt(o.getCreatedAt())
                .build();
    }
}
