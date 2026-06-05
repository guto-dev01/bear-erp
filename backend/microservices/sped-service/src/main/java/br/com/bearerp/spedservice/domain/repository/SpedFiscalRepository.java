package br.com.bearerp.spedservice.domain.repository;

import br.com.bearerp.spedservice.domain.model.SpedFiscal;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface SpedFiscalRepository extends MongoRepository<SpedFiscal, String> {
    Optional<SpedFiscal> findByTenantIdAndEmpresaIdAndAnoAndMes(String tenantId, String empresaId, int ano, int mes);
    List<SpedFiscal> findByTenantIdAndEmpresaIdAndAnoOrderByMesAsc(String tenantId, String empresaId, int ano);
}
