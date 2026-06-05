package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.LoteImportacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LoteImportacaoRepository extends MongoRepository<LoteImportacao, String> {
    Page<LoteImportacao> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    List<LoteImportacao> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, LoteImportacao.StatusImportacao status);
}
