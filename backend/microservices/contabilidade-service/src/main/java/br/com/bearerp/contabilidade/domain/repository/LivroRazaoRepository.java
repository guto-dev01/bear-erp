package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.LivroRazao;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface LivroRazaoRepository extends MongoRepository<LivroRazao, String> {
    List<LivroRazao> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<LivroRazao> findByTenantIdAndEmpresaIdAndContaIdAndDataInicioBetween(String tenantId, String empresaId, String contaId, LocalDate inicio, LocalDate fim);
}
