package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.contabilidade.application.dto.*;
import br.com.bearerp.contabilidade.domain.model.CentroCusto;
import br.com.bearerp.contabilidade.domain.model.CentroCusto.*;
import br.com.bearerp.contabilidade.domain.repository.CentroCustoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CentroCustoUseCase {

    private final CentroCustoRepository centroCustoRepository;

    public CentroCustoResponse create(CreateCentroCustoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (centroCustoRepository.existsByTenantIdAndEmpresaIdAndCodigo(tenantId, empresaId, request.getCodigo())) {
            throw new BusinessException("CENTRO_CUSTO_EXISTS", "Já existe um centro de custo com o código " + request.getCodigo());
        }

        int nivel = 1;
        if (request.getCentroPaiId() != null && !request.getCentroPaiId().isBlank()) {
            CentroCusto pai = centroCustoRepository.findById(request.getCentroPaiId())
                    .orElseThrow(() -> new ResourceNotFoundException("Centro de custo pai", request.getCentroPaiId()));
            nivel = pai.getNivel() + 1;
        }

        CentroCusto cc = CentroCusto.builder()
                .codigo(request.getCodigo())
                .descricao(request.getDescricao())
                .centroPaiId(request.getCentroPaiId())
                .nivel(nivel)
                .tipo(request.getTipo() != null ? TipoCentro.valueOf(request.getTipo()) : TipoCentro.ANALITICO)
                .responsavel(request.getResponsavel())
                .status(StatusCentro.ATIVO)
                .build();
        cc.setTenantId(tenantId);
        cc.setEmpresaId(empresaId);

        cc = centroCustoRepository.save(cc);
        log.info("Centro de custo criado: {} - {} (tenant: {})", cc.getCodigo(), cc.getDescricao(), tenantId);
        return toResponse(cc);
    }

    public CentroCustoResponse update(String id, CreateCentroCustoRequest request) {
        CentroCusto cc = centroCustoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Centro de custo", id));

        if (request.getDescricao() != null) cc.setDescricao(request.getDescricao());
        if (request.getResponsavel() != null) cc.setResponsavel(request.getResponsavel());
        if (request.getTipo() != null) cc.setTipo(TipoCentro.valueOf(request.getTipo()));

        cc = centroCustoRepository.save(cc);
        return toResponse(cc);
    }

    public CentroCustoResponse getById(String id) {
        return toResponse(centroCustoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Centro de custo", id)));
    }

    public List<CentroCustoResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return centroCustoRepository.findByTenantIdAndEmpresaId(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public List<CentroCustoResponse> getArvore() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        List<CentroCusto> todos = centroCustoRepository.findByTenantIdAndEmpresaId(tenantId, empresaId);

        Map<String, List<CentroCusto>> filhosPorPai = todos.stream()
                .filter(c -> c.getCentroPaiId() != null)
                .collect(Collectors.groupingBy(CentroCusto::getCentroPaiId));

        return todos.stream()
                .filter(c -> c.getCentroPaiId() == null || c.getCentroPaiId().isBlank())
                .map(c -> toResponseComFilhos(c, filhosPorPai))
                .toList();
    }

    public void delete(String id) {
        CentroCusto cc = centroCustoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Centro de custo", id));
        cc.setStatus(StatusCentro.INATIVO);
        centroCustoRepository.save(cc);
    }

    private CentroCustoResponse toResponse(CentroCusto c) {
        return CentroCustoResponse.builder()
                .id(c.getId()).codigo(c.getCodigo()).descricao(c.getDescricao())
                .centroPaiId(c.getCentroPaiId()).nivel(c.getNivel())
                .tipo(c.getTipo() != null ? c.getTipo().name() : null)
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .responsavel(c.getResponsavel()).createdAt(c.getCreatedAt())
                .build();
    }

    private CentroCustoResponse toResponseComFilhos(CentroCusto c, Map<String, List<CentroCusto>> filhosPorPai) {
        CentroCustoResponse response = toResponse(c);
        List<CentroCusto> filhos = filhosPorPai.get(c.getId());
        if (filhos != null) {
            response.setFilhos(filhos.stream().map(f -> toResponseComFilhos(f, filhosPorPai)).toList());
        }
        return response;
    }
}
