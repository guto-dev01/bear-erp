package br.com.bearerp.integracoesservice.domain.repository;

import br.com.bearerp.integracoesservice.domain.model.ImportacaoMigracao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ImportacaoMigracaoRepository extends MongoRepository<ImportacaoMigracao, String> {
    Page<ImportacaoMigracao> findByTenantId(String tenantId, Pageable pageable);
    List<ImportacaoMigracao> findByTenantIdAndStatus(String tenantId, ImportacaoMigracao.StatusImportacao status);
    List<ImportacaoMigracao> findByTenantIdAndSistemaOrigem(String tenantId, String sistemaOrigem);
}
