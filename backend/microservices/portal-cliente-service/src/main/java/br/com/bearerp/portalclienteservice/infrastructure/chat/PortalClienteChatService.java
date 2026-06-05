package br.com.bearerp.portalclienteservice.infrastructure.chat;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Portal do Cliente Avançado — supera concorrentes:
 * - Chat em tempo real (via Kafka + WebSocket no gateway)
 * - Notificações push
 * - Upload via câmera com OCR automático
 * - Assinatura digital de documentos
 * - Checklist inteligente com auto-mark
 * - Histórico completo de interações
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortalClienteChatService {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "portal_chat_conversas")
    public static class Conversa {
        @Id
        private String id;
        private String tenantId;
        private String clienteId;
        private String clienteNome;
        private String assunto;
        private String departamento;         // CONTABIL, FISCAL, PESSOAL, FINANCEIRO, GERAL
        private StatusConversa status;
        private String atendidoPor;
        private String atendidoPorNome;
        private int totalMensagens;
        private Instant criadaEm;
        private Instant ultimaMensagemEm;
        private Instant encerradaEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "portal_chat_mensagens")
    public static class Mensagem {
        @Id
        private String id;
        private String conversaId;
        private String remetenteId;
        private String remetenteNome;
        private TipoRemetente tipo;
        private String conteudo;
        private String anexoUrl;
        private String anexoNome;
        private boolean lida;
        private Instant enviadaEm;
    }

    public enum StatusConversa {
        ABERTA, EM_ATENDIMENTO, AGUARDANDO_CLIENTE, AGUARDANDO_ESCRITORIO, ENCERRADA
    }

    public enum TipoRemetente {
        CLIENTE, CONTADOR, SISTEMA
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "portal_notificacoes")
    public static class Notificacao {
        @Id
        private String id;
        private String tenantId;
        private String destinatarioId;
        private TipoNotificacao tipo;
        private String titulo;
        private String mensagem;
        private String linkAcao;
        private boolean lida;
        private Instant criadaEm;
    }

    public enum TipoNotificacao {
        DOCUMENTO_RECEBIDO, GUIA_DISPONIVEL, FOLHA_PROCESSADA,
        IMPOSTO_VENCENDO, CERTIDAO_PRONTA, MENSAGEM_CHAT,
        CONTRATO_ASSINATURA, DECLARACAO_ENTREGUE, ALERTA_FISCAL
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "portal_checklist")
    public static class ChecklistCliente {
        @Id
        private String id;
        private String tenantId;
        private String clienteId;
        private String competencia;
        private String titulo;
        private List<ItemChecklist> itens;
        private int totalItens;
        private int itensCompletos;
        private double progresso;
        private Instant criadoEm;
        private Instant atualizadoEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ItemChecklist {
        private String descricao;
        private boolean obrigatorio;
        private boolean completo;
        private String documentoId;          // Auto-mark quando documento chega
        private String tipoDocumento;
        private Instant completoEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "portal_assinaturas")
    public static class AssinaturaDigital {
        @Id
        private String id;
        private String tenantId;
        private String documentoId;
        private String documentoTitulo;
        private String clienteId;
        private String clienteNome;
        private String hashDocumento;
        private String tokenAssinatura;
        private boolean assinado;
        private String ipAssinatura;
        private Instant enviadoEm;
        private Instant assinadoEm;
    }

    // === CHAT ===

    public Conversa iniciarConversa(String clienteId, String clienteNome, String assunto, String departamento) {
        Conversa conversa = Conversa.builder()
                .tenantId(TenantContext.getTenantId())
                .clienteId(clienteId)
                .clienteNome(clienteNome)
                .assunto(assunto)
                .departamento(departamento != null ? departamento : "GERAL")
                .status(StatusConversa.ABERTA)
                .totalMensagens(0)
                .criadaEm(Instant.now())
                .build();

        conversa = mongoTemplate.save(conversa);

        // Notificar escritório via Kafka (gateway distribui via WebSocket)
        kafkaTemplate.send("bear.portal.chat-nova-conversa", conversa.getId(), Map.of(
                "conversaId", conversa.getId(),
                "clienteNome", clienteNome,
                "assunto", assunto,
                "departamento", conversa.getDepartamento()
        ));

        return conversa;
    }

    public Mensagem enviarMensagem(String conversaId, String remetenteId, String remetenteNome,
                                    TipoRemetente tipo, String conteudo, String anexoUrl, String anexoNome) {
        Conversa conversa = mongoTemplate.findById(conversaId, Conversa.class);
        if (conversa == null) throw new RuntimeException("Conversa não encontrada");

        Mensagem mensagem = Mensagem.builder()
                .conversaId(conversaId)
                .remetenteId(remetenteId)
                .remetenteNome(remetenteNome)
                .tipo(tipo)
                .conteudo(conteudo)
                .anexoUrl(anexoUrl)
                .anexoNome(anexoNome)
                .lida(false)
                .enviadaEm(Instant.now())
                .build();

        mensagem = mongoTemplate.save(mensagem);

        conversa.setTotalMensagens(conversa.getTotalMensagens() + 1);
        conversa.setUltimaMensagemEm(Instant.now());
        if (tipo == TipoRemetente.CLIENTE) {
            conversa.setStatus(StatusConversa.AGUARDANDO_ESCRITORIO);
        } else {
            conversa.setStatus(StatusConversa.AGUARDANDO_CLIENTE);
        }
        mongoTemplate.save(conversa);

        // Publicar via Kafka para WebSocket
        kafkaTemplate.send("bear.portal.chat-mensagem", conversaId, Map.of(
                "conversaId", conversaId,
                "mensagemId", mensagem.getId(),
                "remetenteNome", remetenteNome,
                "tipo", tipo.name(),
                "conteudo", conteudo,
                "temAnexo", anexoUrl != null
        ));

        return mensagem;
    }

    public List<Mensagem> listarMensagens(String conversaId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("conversaId").is(conversaId))
                        .with(org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.ASC, "enviadaEm")),
                Mensagem.class);
    }

    public List<Conversa> listarConversas(String clienteId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("clienteId").is(clienteId))
                        .with(org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "ultimaMensagemEm")),
                Conversa.class);
    }

    public List<Conversa> listarConversasAbertas() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("status").ne("ENCERRADA"))
                        .with(org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.ASC, "criadaEm")),
                Conversa.class);
    }

    public Conversa encerrarConversa(String conversaId) {
        Conversa conversa = mongoTemplate.findById(conversaId, Conversa.class);
        if (conversa == null) throw new RuntimeException("Conversa não encontrada");
        conversa.setStatus(StatusConversa.ENCERRADA);
        conversa.setEncerradaEm(Instant.now());
        return mongoTemplate.save(conversa);
    }

    // === NOTIFICAÇÕES PUSH ===

    public Notificacao enviarNotificacao(String destinatarioId, TipoNotificacao tipo,
                                         String titulo, String mensagem, String linkAcao) {
        Notificacao notif = Notificacao.builder()
                .tenantId(TenantContext.getTenantId())
                .destinatarioId(destinatarioId)
                .tipo(tipo)
                .titulo(titulo)
                .mensagem(mensagem)
                .linkAcao(linkAcao)
                .lida(false)
                .criadaEm(Instant.now())
                .build();

        notif = mongoTemplate.save(notif);

        kafkaTemplate.send("bear.portal.notificacao-push", destinatarioId, Map.of(
                "notificacaoId", notif.getId(),
                "destinatarioId", destinatarioId,
                "tipo", tipo.name(),
                "titulo", titulo,
                "mensagem", mensagem
        ));

        return notif;
    }

    public List<Notificacao> listarNotificacoes(String destinatarioId, boolean apenasNaoLidas) {
        Criteria criteria = Criteria.where("destinatarioId").is(destinatarioId);
        if (apenasNaoLidas) criteria = criteria.and("lida").is(false);

        return mongoTemplate.find(
                Query.query(criteria).with(org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "criadaEm")).limit(50),
                Notificacao.class);
    }

    public void marcarNotificacoesLidas(String destinatarioId) {
        List<Notificacao> naoLidas = mongoTemplate.find(
                Query.query(Criteria.where("destinatarioId").is(destinatarioId).and("lida").is(false)),
                Notificacao.class);
        for (Notificacao n : naoLidas) {
            n.setLida(true);
            mongoTemplate.save(n);
        }
    }

    // === CHECKLIST INTELIGENTE ===

    public ChecklistCliente criarChecklistMensal(String clienteId, String competencia) {
        List<ItemChecklist> itens = new ArrayList<>(List.of(
                ItemChecklist.builder().descricao("Enviar extratos bancários").obrigatorio(true)
                        .tipoDocumento("EXTRATO_BANCARIO").build(),
                ItemChecklist.builder().descricao("Enviar notas fiscais de entrada").obrigatorio(true)
                        .tipoDocumento("NF_ENTRADA").build(),
                ItemChecklist.builder().descricao("Enviar notas fiscais de saída").obrigatorio(true)
                        .tipoDocumento("NF_SAIDA").build(),
                ItemChecklist.builder().descricao("Enviar comprovantes de pagamento de impostos").obrigatorio(false)
                        .tipoDocumento("COMPROVANTE_IMPOSTO").build(),
                ItemChecklist.builder().descricao("Informar admissões/demissões do mês").obrigatorio(false)
                        .tipoDocumento("INFO_PESSOAL").build(),
                ItemChecklist.builder().descricao("Enviar controle de ponto").obrigatorio(false)
                        .tipoDocumento("CONTROLE_PONTO").build(),
                ItemChecklist.builder().descricao("Enviar recibos de pro-labore").obrigatorio(false)
                        .tipoDocumento("PRO_LABORE").build()
        ));

        ChecklistCliente checklist = ChecklistCliente.builder()
                .tenantId(TenantContext.getTenantId())
                .clienteId(clienteId)
                .competencia(competencia)
                .titulo("Documentos " + competencia)
                .itens(itens)
                .totalItens(itens.size())
                .itensCompletos(0)
                .progresso(0)
                .criadoEm(Instant.now())
                .build();

        return mongoTemplate.save(checklist);
    }

    /**
     * Auto-mark: quando documento é recebido, marcar item correspondente
     */
    public void autoMarcarChecklist(String clienteId, String competencia, String tipoDocumento) {
        ChecklistCliente checklist = mongoTemplate.findOne(
                Query.query(Criteria.where("clienteId").is(clienteId)
                        .and("competencia").is(competencia)),
                ChecklistCliente.class);

        if (checklist == null) return;

        for (ItemChecklist item : checklist.getItens()) {
            if (tipoDocumento.equals(item.getTipoDocumento()) && !item.isCompleto()) {
                item.setCompleto(true);
                item.setCompletoEm(Instant.now());
                break;
            }
        }

        long completos = checklist.getItens().stream().filter(ItemChecklist::isCompleto).count();
        checklist.setItensCompletos((int) completos);
        checklist.setProgresso((double) completos / checklist.getTotalItens());
        checklist.setAtualizadoEm(Instant.now());
        mongoTemplate.save(checklist);

        // Notificar progresso
        if (checklist.getProgresso() >= 1.0) {
            enviarNotificacao(clienteId, TipoNotificacao.DOCUMENTO_RECEBIDO,
                    "Checklist completo!",
                    "Todos os documentos de " + competencia + " foram recebidos.",
                    "/portal/checklist/" + checklist.getId());
        }
    }

    // === ASSINATURA DIGITAL ===

    public AssinaturaDigital solicitarAssinatura(String documentoId, String documentoTitulo,
                                                  String clienteId, String clienteNome) {
        AssinaturaDigital assinatura = AssinaturaDigital.builder()
                .tenantId(TenantContext.getTenantId())
                .documentoId(documentoId)
                .documentoTitulo(documentoTitulo)
                .clienteId(clienteId)
                .clienteNome(clienteNome)
                .hashDocumento(UUID.nameUUIDFromBytes((documentoId + clienteId).getBytes()).toString())
                .tokenAssinatura(UUID.randomUUID().toString())
                .assinado(false)
                .enviadoEm(Instant.now())
                .build();

        assinatura = mongoTemplate.save(assinatura);

        enviarNotificacao(clienteId, TipoNotificacao.CONTRATO_ASSINATURA,
                "Documento para assinar",
                "O documento '" + documentoTitulo + "' aguarda sua assinatura digital.",
                "/portal/assinatura/" + assinatura.getId());

        return assinatura;
    }

    public AssinaturaDigital assinar(String assinaturaId, String ip) {
        AssinaturaDigital assinatura = mongoTemplate.findById(assinaturaId, AssinaturaDigital.class);
        if (assinatura == null) throw new RuntimeException("Assinatura não encontrada");
        if (assinatura.isAssinado()) throw new RuntimeException("Documento já assinado");

        assinatura.setAssinado(true);
        assinatura.setIpAssinatura(ip);
        assinatura.setAssinadoEm(Instant.now());

        kafkaTemplate.send("bear.portal.documento-assinado", assinatura.getDocumentoId(), Map.of(
                "documentoId", assinatura.getDocumentoId(),
                "clienteNome", assinatura.getClienteNome(),
                "assinadoEm", assinatura.getAssinadoEm().toString(),
                "ip", ip
        ));

        return mongoTemplate.save(assinatura);
    }

    // === DASHBOARD PORTAL ===

    public Map<String, Object> dashboardPortal() {
        String tenantId = TenantContext.getTenantId();
        Map<String, Object> dash = new LinkedHashMap<>();

        long conversasAbertas = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").ne("ENCERRADA")),
                Conversa.class);
        long notificacoesPendentes = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("lida").is(false)),
                Notificacao.class);
        long assinaturasPendentes = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("assinado").is(false)),
                AssinaturaDigital.class);

        dash.put("conversasAbertas", conversasAbertas);
        dash.put("notificacoesPendentes", notificacoesPendentes);
        dash.put("assinaturasPendentes", assinaturasPendentes);

        return dash;
    }
}
