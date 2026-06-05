package br.com.bearerp.folhaservice.domain.repository;

import br.com.bearerp.folhaservice.domain.model.Holerite;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface HoleriteRepository extends MongoRepository<Holerite, String> {
    List<Holerite> findByTenantIdAndEmpresaIdAndAnoAndMes(String tenantId, String empresaId, int ano, int mes);
    Optional<Holerite> findByTenantIdAndEmpresaIdAndFuncionarioIdAndAnoAndMes(String tenantId, String empresaId, String funcId, int ano, int mes);
    List<Holerite> findByTenantIdAndEmpresaIdAndFuncionarioIdOrderByAnoDescMesDesc(String tenantId, String empresaId, String funcId);
}
