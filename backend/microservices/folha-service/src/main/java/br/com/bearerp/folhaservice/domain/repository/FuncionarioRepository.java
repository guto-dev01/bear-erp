package br.com.bearerp.folhaservice.domain.repository;

import br.com.bearerp.folhaservice.domain.model.Funcionario;
import br.com.bearerp.folhaservice.domain.model.Funcionario.StatusFuncionario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface FuncionarioRepository extends MongoRepository<Funcionario, String> {
    Page<Funcionario> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    List<Funcionario> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, StatusFuncionario status);
    Optional<Funcionario> findByTenantIdAndEmpresaIdAndCpf(String tenantId, String empresaId, String cpf);
    Optional<Funcionario> findByTenantIdAndEmpresaIdAndMatricula(String tenantId, String empresaId, String matricula);
    boolean existsByTenantIdAndEmpresaIdAndCpf(String tenantId, String empresaId, String cpf);
    long countByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, StatusFuncionario status);
}
