package br.com.bearerp.fiscalservice.domain.repository;

import br.com.bearerp.fiscalservice.domain.model.ApuracaoPisCofins;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ApuracaoPisCofinsRepository extends MongoRepository<ApuracaoPisCofins, String> {
    Optional<ApuracaoPisCofins> findByTenantIdAndEmpresaIdAndAnoAndMes(String tenantId, String empresaId, int ano, int mes);
    List<ApuracaoPisCofins> findByTenantIdAndEmpresaIdAndAnoOrderByMesAsc(String tenantId, String empresaId, int ano);
}
