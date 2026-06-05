package br.com.bearerp.clientes.domain.repository;

import br.com.bearerp.clientes.domain.model.Cliente;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends MongoRepository<Cliente, String> {
    List<Cliente> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<Cliente> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, Cliente.StatusCliente status);
    Optional<Cliente> findByTenantIdAndEmpresaIdAndCnpjCpf(String tenantId, String empresaId, String cnpjCpf);
    boolean existsByTenantIdAndEmpresaIdAndCnpjCpf(String tenantId, String empresaId, String cnpjCpf);

    @Query("{'tenantId': ?0, 'empresaId': ?1, '$or': [{'razaoSocial': {$regex: ?2, $options: 'i'}}, {'nomeFantasia': {$regex: ?2, $options: 'i'}}, {'cnpjCpf': {$regex: ?2, $options: 'i'}}]}")
    List<Cliente> search(String tenantId, String empresaId, String query);
}
