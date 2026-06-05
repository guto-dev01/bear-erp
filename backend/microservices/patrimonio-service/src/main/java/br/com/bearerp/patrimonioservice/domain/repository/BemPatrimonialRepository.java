package br.com.bearerp.patrimonioservice.domain.repository;

import br.com.bearerp.patrimonioservice.domain.model.BemPatrimonial;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BemPatrimonialRepository extends MongoRepository<BemPatrimonial, String> {
    Page<BemPatrimonial> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    Page<BemPatrimonial> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, BemPatrimonial.StatusBem status, Pageable pageable);
    List<BemPatrimonial> findByTenantIdAndEmpresaIdAndGrupoContabil(String tenantId, String empresaId, BemPatrimonial.GrupoContabil grupo);
    List<BemPatrimonial> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, BemPatrimonial.StatusBem status);
}
