package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.contabilidade.application.dto.*;
import br.com.bearerp.contabilidade.domain.model.RegrasContabilizacao;
import br.com.bearerp.contabilidade.domain.model.RegrasContabilizacao.*;
import br.com.bearerp.contabilidade.domain.repository.RegrasContabilizacaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegrasContabilizacaoUseCase {

    private final RegrasContabilizacaoRepository repository;

    public RegrasContabilizacaoResponse create(CreateRegrasContabilizacaoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (repository.existsByTenantIdAndEmpresaIdAndNome(tenantId, empresaId, request.getNome())) {
            throw new BusinessException("REGRA_EXISTS", "Já existe uma regra com o nome " + request.getNome());
        }

        RegrasContabilizacao regra = RegrasContabilizacao.builder()
                .nome(request.getNome())
                .descricao(request.getDescricao())
                .tipoEvento(TipoEvento.valueOf(request.getTipoEvento()))
                .contaDebito(request.getContaDebito())
                .contaCredito(request.getContaCredito())
                .condicao(request.getCondicao())
                .historicoPadrao(request.getHistoricoPadrao())
                .ativa(true)
                .prioridade(0)
                .build();
        regra.setTenantId(tenantId);
        regra.setEmpresaId(empresaId);

        regra = repository.save(regra);
        log.info("Regra de contabilização criada: {} (tenant: {})", regra.getNome(), tenantId);
        return toResponse(regra);
    }

    public RegrasContabilizacaoResponse update(String id, CreateRegrasContabilizacaoRequest request) {
        RegrasContabilizacao regra = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regra", id));

        if (request.getNome() != null) regra.setNome(request.getNome());
        if (request.getDescricao() != null) regra.setDescricao(request.getDescricao());
        if (request.getTipoEvento() != null) regra.setTipoEvento(TipoEvento.valueOf(request.getTipoEvento()));
        if (request.getContaDebito() != null) regra.setContaDebito(request.getContaDebito());
        if (request.getContaCredito() != null) regra.setContaCredito(request.getContaCredito());
        if (request.getCondicao() != null) regra.setCondicao(request.getCondicao());
        if (request.getHistoricoPadrao() != null) regra.setHistoricoPadrao(request.getHistoricoPadrao());

        regra = repository.save(regra);
        return toResponse(regra);
    }

    public RegrasContabilizacaoResponse getById(String id) {
        return toResponse(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regra", id)));
    }

    public List<RegrasContabilizacaoResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return repository.findByTenantIdAndEmpresaId(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public RegrasContabilizacaoResponse toggleAtiva(String id) {
        RegrasContabilizacao regra = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regra", id));
        regra.setAtiva(!regra.isAtiva());
        regra = repository.save(regra);
        return toResponse(regra);
    }

    public void delete(String id) {
        repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Regra", id));
        repository.deleteById(id);
    }

    public List<Map<String, Object>> executarRegras() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        List<RegrasContabilizacao> regrasAtivas = repository.findByTenantIdAndEmpresaIdAndAtiva(tenantId, empresaId, true);

        List<Map<String, Object>> lancamentos = new ArrayList<>();
        for (RegrasContabilizacao r : regrasAtivas) {
            Map<String, Object> lanc = new HashMap<>();
            lanc.put("regraNome", r.getNome());
            lanc.put("tipoEvento", r.getTipoEvento().name());
            lanc.put("contaDebito", r.getContaDebito());
            lanc.put("contaCredito", r.getContaCredito());
            lanc.put("historico", r.getHistoricoPadrao());
            lanc.put("data", java.time.LocalDate.now().toString());
            lanc.put("valor", 0);
            lancamentos.add(lanc);
        }
        log.info("Regras executadas: {} lançamentos gerados (tenant: {})", lancamentos.size(), tenantId);
        return lancamentos;
    }

    private RegrasContabilizacaoResponse toResponse(RegrasContabilizacao r) {
        return RegrasContabilizacaoResponse.builder()
                .id(r.getId()).nome(r.getNome()).descricao(r.getDescricao())
                .tipoEvento(r.getTipoEvento() != null ? r.getTipoEvento().name() : null)
                .contaDebito(r.getContaDebito()).contaCredito(r.getContaCredito())
                .condicao(r.getCondicao()).historicoPadrao(r.getHistoricoPadrao())
                .ativa(r.isAtiva()).prioridade(r.getPrioridade())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
