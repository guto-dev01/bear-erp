package br.com.bearerp.notificacao.domain.repository;

import br.com.bearerp.notificacao.domain.model.Notificacao;
import br.com.bearerp.notificacao.domain.model.Notificacao.StatusNotificacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificacaoRepository extends MongoRepository<Notificacao, String> {
    Page<Notificacao> findByTenantId(String tenantId, Pageable pageable);
    List<Notificacao> findByStatus(StatusNotificacao status);
    List<Notificacao> findByStatusAndTentativasLessThan(StatusNotificacao status, int maxTentativas);
}
