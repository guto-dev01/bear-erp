package br.com.bearerp.folhaservice.domain.repository;

import br.com.bearerp.folhaservice.domain.model.Ferias;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface FeriasRepository extends MongoRepository<Ferias, String> {
    List<Ferias> findByTenantIdAndEmpresaIdAndFuncionarioIdOrderByDataInicioDesc(String tenantId, String empresaId, String funcId);
    List<Ferias> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, Ferias.StatusFerias status);
    List<Ferias> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
}
