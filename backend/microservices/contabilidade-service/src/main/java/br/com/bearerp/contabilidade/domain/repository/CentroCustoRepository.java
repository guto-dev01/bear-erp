package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.CentroCusto;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CentroCustoRepository extends MongoRepository<CentroCusto, String> {
    List<CentroCusto> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    Optional<CentroCusto> findByTenantIdAndEmpresaIdAndCodigo(String tenantId, String empresaId, String codigo);
    List<CentroCusto> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, CentroCusto.StatusCentro status);
    List<CentroCusto> findByTenantIdAndEmpresaIdAndCentroPaiId(String tenantId, String empresaId, String centroPaiId);
    boolean existsByTenantIdAndEmpresaIdAndCodigo(String tenantId, String empresaId, String codigo);
}
