package br.com.bearerp.escritorioservice.domain.repository;

import br.com.bearerp.escritorioservice.domain.model.TarefaContabil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface TarefaContabilRepository extends MongoRepository<TarefaContabil, String> {
    Page<TarefaContabil> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    Page<TarefaContabil> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, TarefaContabil.StatusTarefa status, Pageable pageable);
    List<TarefaContabil> findByTenantIdAndResponsavelIdAndStatus(String tenantId, String responsavelId, TarefaContabil.StatusTarefa status);
    List<TarefaContabil> findByTenantIdAndEmpresaIdAndStatusAndDataVencimentoLessThanEqual(String tenantId, String empresaId, TarefaContabil.StatusTarefa status, LocalDate data);
    List<TarefaContabil> findByTenantIdAndEmpresaIdAndClienteEmpresaId(String tenantId, String empresaId, String clienteEmpresaId);
}
