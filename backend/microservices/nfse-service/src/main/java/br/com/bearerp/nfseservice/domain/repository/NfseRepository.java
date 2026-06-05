package br.com.bearerp.nfseservice.domain.repository;

import br.com.bearerp.nfseservice.domain.model.NotaFiscalServico;
import br.com.bearerp.nfseservice.domain.model.NotaFiscalServico.StatusNfse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface NfseRepository extends MongoRepository<NotaFiscalServico, String> {
    Page<NotaFiscalServico> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    Optional<NotaFiscalServico> findByTenantIdAndEmpresaIdAndNumero(String tenantId, String empresaId, Long numero);
    List<NotaFiscalServico> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, StatusNfse status);

    @Query("{'tenantId': ?0, 'empresaId': ?1, 'competencia': {$gte: ?2, $lte: ?3}}")
    List<NotaFiscalServico> findByTenantIdAndEmpresaIdAndCompetenciaBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);

    @Query(value = "{'tenantId': ?0, 'empresaId': ?1}", sort = "{'numero': -1}")
    Optional<NotaFiscalServico> findTopByTenantIdAndEmpresaIdOrderByNumeroDesc(String tenantId, String empresaId);

    List<NotaFiscalServico> findByTenantIdAndEmpresaIdAndTomadorCpfCnpj(String tenantId, String empresaId, String cpfCnpj);
}
