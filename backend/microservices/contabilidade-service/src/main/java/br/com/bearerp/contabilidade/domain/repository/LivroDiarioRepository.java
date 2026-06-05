package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.LivroDiario;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface LivroDiarioRepository extends MongoRepository<LivroDiario, String> {
    List<LivroDiario> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<LivroDiario> findByTenantIdAndEmpresaIdAndDataInicioBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);
}
