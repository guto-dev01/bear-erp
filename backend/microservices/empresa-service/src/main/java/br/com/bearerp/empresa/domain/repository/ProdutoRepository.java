package br.com.bearerp.empresa.domain.repository;

import br.com.bearerp.empresa.domain.model.Produto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProdutoRepository extends MongoRepository<Produto, String> {
    Page<Produto> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    Optional<Produto> findByTenantIdAndEmpresaIdAndCodigo(String tenantId, String empresaId, String codigo);
    List<Produto> findByTenantIdAndEmpresaIdAndTipo(String tenantId, String empresaId, Produto.TipoProduto tipo);
    List<Produto> findByTenantIdAndEmpresaIdAndCategoria(String tenantId, String empresaId, String categoria);

    @Query("{'tenantId': ?0, 'empresaId': ?1, '$or': [{'descricao': {$regex: ?2, $options: 'i'}}, {'codigo': {$regex: ?2, $options: 'i'}}]}")
    List<Produto> buscar(String tenantId, String empresaId, String termo);

    boolean existsByTenantIdAndEmpresaIdAndCodigo(String tenantId, String empresaId, String codigo);
}
