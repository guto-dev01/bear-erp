package br.com.bearerp.aicontabilservice.domain.repository;

import br.com.bearerp.aicontabilservice.domain.model.ClassificacaoAutomatica;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ClassificacaoAutomaticaRepository extends MongoRepository<ClassificacaoAutomatica, String> {
    Page<ClassificacaoAutomatica> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    List<ClassificacaoAutomatica> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, ClassificacaoAutomatica.StatusClassificacao status);
}
