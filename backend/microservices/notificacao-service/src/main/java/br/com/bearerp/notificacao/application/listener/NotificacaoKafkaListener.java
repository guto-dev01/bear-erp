package br.com.bearerp.notificacao.application.listener;

import br.com.bearerp.notificacao.application.service.NotificacaoService;
import br.com.bearerp.notificacao.domain.model.Notificacao.CategoriaNotificacao;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificacaoKafkaListener {

    private final NotificacaoService notificacaoService;

    @KafkaListener(topics = "bear.fiscal.nfe-autorizada", groupId = "notificacao-nfe")
    public void onNfeAutorizada(Map<String, Object> event) {
        try {
            String tenantId = str(event.get("tenantId"));
            String email = str(event.get("destinatarioEmail"));
            String numero = str(event.get("numero"));

            if (email != null && !email.isBlank()) {
                notificacaoService.enviar(tenantId, email, str(event.get("destinatarioNome")),
                        "NF-e nº " + numero + " autorizada",
                        "nfe-autorizada", CategoriaNotificacao.FISCAL,
                        Map.of("numero", numero, "chaveAcesso", str(event.get("chaveAcesso")),
                                "valor", str(event.get("valorTotal"))));
            }
            log.info("Evento NF-e autorizada processado: {}", numero);
        } catch (Exception e) {
            log.error("Erro ao processar evento NF-e autorizada: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "bear.folha.folha-fechada", groupId = "notificacao-folha")
    public void onFolhaFechada(Map<String, Object> event) {
        try {
            String tenantId = str(event.get("tenantId"));
            String competencia = str(event.get("competencia"));
            log.info("Evento folha fechada processado: competência {}", competencia);
        } catch (Exception e) {
            log.error("Erro ao processar evento folha fechada: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "bear.fiscal.obrigacao-vencendo", groupId = "notificacao-obrigacao")
    public void onObrigacaoVencendo(Map<String, Object> event) {
        try {
            String tenantId = str(event.get("tenantId"));
            String email = str(event.get("contadorEmail"));
            String obrigacao = str(event.get("nome"));
            String vencimento = str(event.get("dataVencimento"));

            if (email != null && !email.isBlank()) {
                notificacaoService.enviar(tenantId, email, str(event.get("contadorNome")),
                        "Obrigação " + obrigacao + " vencendo em " + vencimento,
                        "obrigacao-vencendo", CategoriaNotificacao.OBRIGACAO,
                        Map.of("obrigacao", obrigacao, "vencimento", vencimento));
            }
            log.info("Alerta de obrigação vencendo: {} em {}", obrigacao, vencimento);
        } catch (Exception e) {
            log.error("Erro ao processar evento obrigação vencendo: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "bear.financeiro.conta-vencida", groupId = "notificacao-financeiro")
    public void onContaVencida(Map<String, Object> event) {
        try {
            String tenantId = str(event.get("tenantId"));
            String email = str(event.get("email"));
            String descricao = str(event.get("descricao"));
            String valor = str(event.get("valor"));

            if (email != null && !email.isBlank()) {
                notificacaoService.enviar(tenantId, email, "",
                        "Conta vencida: " + descricao,
                        "boleto-vencimento", CategoriaNotificacao.VENCIMENTO,
                        Map.of("descricao", descricao, "valor", valor));
            }
            log.info("Alerta conta vencida: {}", descricao);
        } catch (Exception e) {
            log.error("Erro ao processar evento conta vencida: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "bear.auth.user-created", groupId = "notificacao-auth")
    public void onUsuarioCriado(Map<String, Object> event) {
        try {
            String tenantId = str(event.get("tenantId"));
            String email = str(event.get("email"));
            String nome = str(event.get("nome"));

            if (email != null && !email.isBlank()) {
                notificacaoService.enviar(tenantId, email, nome,
                        "Bem-vindo ao Bear ERP!",
                        "bem-vindo", CategoriaNotificacao.SISTEMA,
                        Map.of("nome", nome, "email", email));
            }
            log.info("Email de boas-vindas enviado para: {}", email);
        } catch (Exception e) {
            log.error("Erro ao processar evento usuário criado: {}", e.getMessage());
        }
    }

    private String str(Object v) { return v != null ? v.toString() : ""; }
}
