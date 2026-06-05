package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.PeriodoContabil;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PeriodoContabilRepository extends MongoRepository<PeriodoContabil, String> {
    Optional<PeriodoContabil> findByTenantIdAndEmpresaIdAndAnoAndMes(String tenantId, String empresaId, int ano, int mes);
    List<PeriodoContabil> findByTenantIdAndEmpresaIdAndAno(String tenantId, String empresaId, int ano);
    List<PeriodoContabil> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, PeriodoContabil.StatusPeriodo status);
}
