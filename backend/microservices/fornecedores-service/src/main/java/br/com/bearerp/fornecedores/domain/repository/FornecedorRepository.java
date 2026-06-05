package br.com.bearerp.fornecedores.domain.repository;

import br.com.bearerp.fornecedores.domain.model.Fornecedor;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FornecedorRepository extends MongoRepository<Fornecedor, String> {
    List<Fornecedor> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<Fornecedor> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, Fornecedor.StatusFornecedor status);
    Optional<Fornecedor> findByTenantIdAndEmpresaIdAndCnpjCpf(String tenantId, String empresaId, String cnpjCpf);
    boolean existsByTenantIdAndEmpresaIdAndCnpjCpf(String tenantId, String empresaId, String cnpjCpf);

    @Query("{'tenantId': ?0, 'empresaId': ?1, '$or': [{'razaoSocial': {$regex: ?2, $options: 'i'}}, {'nomeFantasia': {$regex: ?2, $options: 'i'}}, {'cnpjCpf': {$regex: ?2, $options: 'i'}}]}")
    List<Fornecedor> search(String tenantId, String empresaId, String query);
}
