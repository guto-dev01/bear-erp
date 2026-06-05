package br.com.bearerp.folhaservice.domain.repository;

import br.com.bearerp.folhaservice.domain.model.FolhaPagamento;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface FolhaPagamentoRepository extends MongoRepository<FolhaPagamento, String> {
    Optional<FolhaPagamento> findByTenantIdAndEmpresaIdAndAnoAndMes(String tenantId, String empresaId, int ano, int mes);
    List<FolhaPagamento> findByTenantIdAndEmpresaIdAndAnoOrderByMesAsc(String tenantId, String empresaId, int ano);
}
