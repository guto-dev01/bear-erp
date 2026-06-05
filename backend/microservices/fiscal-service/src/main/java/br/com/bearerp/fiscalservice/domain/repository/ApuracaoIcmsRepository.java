package br.com.bearerp.fiscalservice.domain.repository;

import br.com.bearerp.fiscalservice.domain.model.ApuracaoIcms;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ApuracaoIcmsRepository extends MongoRepository<ApuracaoIcms, String> {
    Optional<ApuracaoIcms> findByTenantIdAndEmpresaIdAndAnoAndMes(String tenantId, String empresaId, int ano, int mes);
    List<ApuracaoIcms> findByTenantIdAndEmpresaIdAndAnoOrderByMesAsc(String tenantId, String empresaId, int ano);
    List<ApuracaoIcms> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, ApuracaoIcms.StatusApuracao status);
}
