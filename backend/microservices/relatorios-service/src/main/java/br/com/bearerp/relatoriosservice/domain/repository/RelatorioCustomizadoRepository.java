package br.com.bearerp.relatoriosservice.domain.repository;

import br.com.bearerp.relatoriosservice.domain.model.RelatorioCustomizado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RelatorioCustomizadoRepository extends MongoRepository<RelatorioCustomizado, String> {
    Page<RelatorioCustomizado> findByTenantId(String tenantId, Pageable pageable);
    List<RelatorioCustomizado> findByTenantIdAndCategoria(String tenantId, String categoria);
    List<RelatorioCustomizado> findByTenantIdAndCompartilhado(String tenantId, boolean compartilhado);
}
