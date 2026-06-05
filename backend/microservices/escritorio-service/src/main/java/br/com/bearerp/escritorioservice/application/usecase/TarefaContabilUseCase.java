package br.com.bearerp.escritorioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.escritorioservice.domain.model.TarefaContabil;
import br.com.bearerp.escritorioservice.domain.repository.TarefaContabilRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor
public class TarefaContabilUseCase {
    private final TarefaContabilRepository repository;

    public Page<TarefaContabil> listar(TarefaContabil.StatusTarefa status, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        if (status != null) {
            return repository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, status, pageable);
        }
        return repository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable);
    }

    public TarefaContabil criar(TarefaContabil tarefa) {
        tarefa.setTenantId(TenantContext.getTenantId());
        tarefa.setEmpresaId(TenantContext.getEmpresaId());
        tarefa.setStatus(TarefaContabil.StatusTarefa.PENDENTE);
        return repository.save(tarefa);
    }

    public TarefaContabil atualizar(String id, TarefaContabil.StatusTarefa novoStatus) {
        TarefaContabil tarefa = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tarefa não encontrada"));
        tarefa.setStatus(novoStatus);
        if (novoStatus == TarefaContabil.StatusTarefa.CONCLUIDA) {
            tarefa.setDataConclusao(LocalDate.now());
        }
        return repository.save(tarefa);
    }

    public List<TarefaContabil> listarAtrasadas() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        List<TarefaContabil> atrasadas = repository.findByTenantIdAndEmpresaIdAndStatusAndDataVencimentoLessThanEqual(
                tenantId, empresaId, TarefaContabil.StatusTarefa.PENDENTE, LocalDate.now());
        atrasadas.addAll(repository.findByTenantIdAndEmpresaIdAndStatusAndDataVencimentoLessThanEqual(
                tenantId, empresaId, TarefaContabil.StatusTarefa.EM_ANDAMENTO, LocalDate.now()));
        atrasadas.forEach(t -> {
            t.setStatus(TarefaContabil.StatusTarefa.ATRASADA);
            repository.save(t);
        });
        return atrasadas;
    }

    public List<TarefaContabil> listarPorResponsavel(String responsavelId) {
        return repository.findByTenantIdAndResponsavelIdAndStatus(
                TenantContext.getTenantId(), responsavelId, TarefaContabil.StatusTarefa.PENDENTE);
    }
}
