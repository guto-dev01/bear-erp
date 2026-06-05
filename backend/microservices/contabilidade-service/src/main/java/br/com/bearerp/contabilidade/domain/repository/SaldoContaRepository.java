package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.SaldoConta;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SaldoContaRepository extends MongoRepository<SaldoConta, String> {
    List<SaldoConta> findByTenantIdAndEmpresaIdAndAnoAndMes(String tenantId, String empresaId, int ano, int mes);
    Optional<SaldoConta> findByTenantIdAndEmpresaIdAndContaIdAndAnoAndMes(String tenantId, String empresaId, String contaId, int ano, int mes);
    List<SaldoConta> findByTenantIdAndEmpresaIdAndContaIdAndAno(String tenantId, String empresaId, String contaId, int ano);
    List<SaldoConta> findByTenantIdAndEmpresaIdAndCentroCustoIdAndAnoAndMes(String tenantId, String empresaId, String centroCustoId, int ano, int mes);
    void deleteByTenantIdAndEmpresaIdAndAnoAndMes(String tenantId, String empresaId, int ano, int mes);
    List<SaldoConta> findByTenantIdAndEmpresaIdAndAnoAndMesOrderByContaCodigoAsc(String tenantId, String empresaId, int ano, int mes);
}
