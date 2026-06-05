package br.com.bearerp.patrimonioservice.domain.repository;

import br.com.bearerp.patrimonioservice.domain.model.MovimentacaoBem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MovimentacaoBemRepository extends MongoRepository<MovimentacaoBem, String> {
    List<MovimentacaoBem> findByTenantIdAndEmpresaIdAndBemId(String tenantId, String empresaId, String bemId);
}
