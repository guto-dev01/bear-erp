package br.com.bearerp.spedservice.domain.repository;

import br.com.bearerp.spedservice.domain.model.SpedContabil;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface SpedContabilRepository extends MongoRepository<SpedContabil, String> {
    Optional<SpedContabil> findByTenantIdAndEmpresaIdAndAno(String tenantId, String empresaId, int ano);
    List<SpedContabil> findByTenantIdAndEmpresaIdOrderByAnoDesc(String tenantId, String empresaId);
}
