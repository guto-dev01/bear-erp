package br.com.bearerp.relatoriosservice.domain.repository;

import br.com.bearerp.relatoriosservice.domain.model.Relatorio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RelatorioRepository extends MongoRepository<Relatorio, String> {
    Page<Relatorio> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    List<Relatorio> findByTenantIdAndEmpresaIdAndTipo(String tenantId, String empresaId, Relatorio.TipoRelatorio tipo);
    List<Relatorio> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, Relatorio.StatusRelatorio status);
}
