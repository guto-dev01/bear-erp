package br.com.bearerp.folhaservice.domain.repository;

import br.com.bearerp.folhaservice.domain.model.Rescisao;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface RescisaoRepository extends MongoRepository<Rescisao, String> {
    Optional<Rescisao> findByTenantIdAndEmpresaIdAndFuncionarioId(String tenantId, String empresaId, String funcId);
    List<Rescisao> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
}
