package br.com.bearerp.spedservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.spedservice.application.dto.CreateObrigacaoRequest;
import br.com.bearerp.spedservice.application.dto.ObrigacaoAcessoriaResponse;
import br.com.bearerp.spedservice.domain.model.ObrigacaoAcessoria;
import br.com.bearerp.spedservice.domain.model.ObrigacaoAcessoria.*;
import br.com.bearerp.spedservice.domain.repository.ObrigacaoAcessoriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ObrigacaoAcessoriaUseCase {

    private final ObrigacaoAcessoriaRepository obrigacaoRepository;

    public ObrigacaoAcessoriaResponse criarObrigacao(CreateObrigacaoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        ObrigacaoAcessoria obrigacao = ObrigacaoAcessoria.builder()
                .tipo(TipoObrigacao.valueOf(request.getTipo()))
                .competencia(request.getCompetencia())
                .prazoEntrega(request.getPrazoEntrega())
                .status(StatusObrigacao.PENDENTE)
                .retificacao(request.isRetificacao())
                .observacao(request.getObservacao())
                .build();
        obrigacao.setTenantId(tenantId);
        obrigacao.setEmpresaId(empresaId);

        obrigacao = obrigacaoRepository.save(obrigacao);
        log.info("Obrigação {} criada - competência {} (tenant: {})", request.getTipo(), request.getCompetencia(), tenantId);
        return toResponse(obrigacao);
    }

    public ObrigacaoAcessoriaResponse marcarTransmitida(String id, String protocolo) {
        String tenantId = TenantContext.getTenantId();
        ObrigacaoAcessoria obrigacao = findById(id, tenantId);
        obrigacao.setStatus(StatusObrigacao.TRANSMITIDA);
        obrigacao.setDataEntrega(Instant.now());
        obrigacao.setProtocoloRecibo(protocolo != null ? protocolo : "REC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        obrigacao = obrigacaoRepository.save(obrigacao);
        return toResponse(obrigacao);
    }

    public List<ObrigacaoAcessoriaResponse> listarPorCompetencia(String competencia) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return obrigacaoRepository.findByTenantIdAndEmpresaIdAndCompetencia(tenantId, empresaId, competencia)
                .stream().map(this::toResponse).toList();
    }

    public List<ObrigacaoAcessoriaResponse> listarPendentes() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        // Atualizar status de atrasadas
        List<ObrigacaoAcessoria> pendentes = obrigacaoRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, StatusObrigacao.PENDENTE);
        LocalDate hoje = LocalDate.now();
        for (ObrigacaoAcessoria o : pendentes) {
            if (o.getPrazoEntrega().isBefore(hoje)) {
                o.setStatus(StatusObrigacao.ATRASADA);
                obrigacaoRepository.save(o);
            }
        }
        List<ObrigacaoAcessoria> atrasadas = obrigacaoRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, StatusObrigacao.ATRASADA);
        pendentes.addAll(atrasadas);
        return pendentes.stream().map(this::toResponse).toList();
    }

    public List<ObrigacaoAcessoriaResponse> listarPorPeriodo(LocalDate inicio, LocalDate fim) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return obrigacaoRepository.findByTenantIdAndEmpresaIdAndPrazoEntregaBetween(tenantId, empresaId, inicio, fim)
                .stream().map(this::toResponse).toList();
    }

    private ObrigacaoAcessoria findById(String id, String tenantId) {
        ObrigacaoAcessoria o = obrigacaoRepository.findById(id)
                .orElseThrow(() -> new BusinessException("OBRIGACAO_NAO_ENCONTRADA", "Obrigação não encontrada"));
        if (!o.getTenantId().equals(tenantId)) throw new BusinessException("ACESSO_NEGADO", "Acesso negado");
        return o;
    }

    private ObrigacaoAcessoriaResponse toResponse(ObrigacaoAcessoria o) {
        return ObrigacaoAcessoriaResponse.builder()
                .id(o.getId()).tipo(o.getTipo().name())
                .competencia(o.getCompetencia()).prazoEntrega(o.getPrazoEntrega())
                .status(o.getStatus().name()).dataEntrega(o.getDataEntrega())
                .protocoloRecibo(o.getProtocoloRecibo()).nomeArquivo(o.getNomeArquivo())
                .retificacao(o.isRetificacao()).observacao(o.getObservacao())
                .build();
    }
}
