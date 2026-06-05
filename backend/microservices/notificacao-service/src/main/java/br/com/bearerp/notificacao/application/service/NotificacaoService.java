package br.com.bearerp.notificacao.application.service;

import br.com.bearerp.notificacao.domain.model.Notificacao;
import br.com.bearerp.notificacao.domain.model.Notificacao.*;
import br.com.bearerp.notificacao.domain.repository.NotificacaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificacaoService {

    private final NotificacaoRepository repository;
    private final EmailService emailService;

    @Value("${notificacao.retry.max-tentativas:3}")
    private int maxTentativas;

    public Notificacao enviar(String tenantId, String destinatarioEmail, String destinatarioNome,
                              String assunto, String templateName, CategoriaNotificacao categoria,
                              Map<String, Object> variaveis) {
        Notificacao notificacao = Notificacao.builder()
                .destinatarioEmail(destinatarioEmail)
                .destinatarioNome(destinatarioNome)
                .tipo(TipoNotificacao.EMAIL)
                .categoria(categoria)
                .assunto(assunto)
                .templateName(templateName)
                .status(StatusNotificacao.PENDENTE)
                .tentativas(0)
                .build();
        notificacao.setTenantId(tenantId);
        notificacao = repository.save(notificacao);

        try {
            emailService.enviarEmail(destinatarioEmail, assunto, templateName, variaveis);
            notificacao.setStatus(StatusNotificacao.ENVIADA);
            notificacao.setEnviadoEm(Instant.now());
            notificacao.setTentativas(1);
        } catch (Exception e) {
            notificacao.setStatus(StatusNotificacao.FALHA);
            notificacao.setErro(e.getMessage());
            notificacao.setTentativas(1);
            log.error("Falha ao enviar notificação para {}: {}", destinatarioEmail, e.getMessage());
        }

        return repository.save(notificacao);
    }

    public Notificacao reenviar(String id) {
        Notificacao n = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notificação não encontrada: " + id));

        if (n.getStatus() != StatusNotificacao.FALHA) {
            throw new RuntimeException("Apenas notificações com falha podem ser reenviadas");
        }

        try {
            emailService.enviarEmail(n.getDestinatarioEmail(), n.getAssunto(), n.getTemplateName(), Map.of());
            n.setStatus(StatusNotificacao.ENVIADA);
            n.setEnviadoEm(Instant.now());
            n.setErro(null);
        } catch (Exception e) {
            n.setErro(e.getMessage());
        }
        n.setTentativas(n.getTentativas() + 1);
        return repository.save(n);
    }

    public Page<Notificacao> listar(String tenantId, int page, int size) {
        return repository.findByTenantId(tenantId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    public List<Notificacao> listarPendentes() {
        return repository.findByStatus(StatusNotificacao.PENDENTE);
    }

    @Scheduled(fixedDelayString = "${notificacao.retry.intervalo-ms:60000}")
    public void reprocessarFalhas() {
        List<Notificacao> falhas = repository.findByStatusAndTentativasLessThan(StatusNotificacao.FALHA, maxTentativas);
        for (Notificacao n : falhas) {
            try {
                emailService.enviarEmail(n.getDestinatarioEmail(), n.getAssunto(), n.getTemplateName(), Map.of());
                n.setStatus(StatusNotificacao.ENVIADA);
                n.setEnviadoEm(Instant.now());
                n.setErro(null);
            } catch (Exception e) {
                n.setErro(e.getMessage());
            }
            n.setTentativas(n.getTentativas() + 1);
            repository.save(n);
        }
        if (!falhas.isEmpty()) {
            log.info("Reprocessadas {} notificações com falha", falhas.size());
        }
    }
}
