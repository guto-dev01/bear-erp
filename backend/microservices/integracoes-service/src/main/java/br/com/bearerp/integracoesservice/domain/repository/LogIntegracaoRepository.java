package br.com.bearerp.integracoesservice.domain.repository;

import br.com.bearerp.integracoesservice.domain.model.LogIntegracao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LogIntegracaoRepository extends MongoRepository<LogIntegracao, String> {
    Page<LogIntegracao> findByIntegracaoId(String integracaoId, Pageable pageable);
}
