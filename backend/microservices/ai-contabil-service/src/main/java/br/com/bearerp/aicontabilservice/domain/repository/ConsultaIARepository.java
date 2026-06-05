package br.com.bearerp.aicontabilservice.domain.repository;

import br.com.bearerp.aicontabilservice.domain.model.ConsultaIA;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ConsultaIARepository extends MongoRepository<ConsultaIA, String> {
    Page<ConsultaIA> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
}
