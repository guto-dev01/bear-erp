package br.com.bearerp.portalclienteservice.interfaces.rest;

import br.com.bearerp.portalclienteservice.infrastructure.chat.PortalClienteChatService;
import br.com.bearerp.portalclienteservice.infrastructure.chat.PortalClienteChatService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/portal-cliente")
@RequiredArgsConstructor
public class PortalClienteChatController {

    private final PortalClienteChatService chatService;

    // Chat
    @PostMapping("/chat/iniciar")
    public ResponseEntity<Conversa> iniciarConversa(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(chatService.iniciarConversa(
                dados.get("clienteId"), dados.get("clienteNome"),
                dados.get("assunto"), dados.get("departamento")));
    }

    @PostMapping("/chat/{conversaId}/mensagem")
    public ResponseEntity<Mensagem> enviarMensagem(
            @PathVariable String conversaId, @RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(chatService.enviarMensagem(conversaId,
                dados.get("remetenteId"), dados.get("remetenteNome"),
                TipoRemetente.valueOf(dados.getOrDefault("tipo", "CLIENTE")),
                dados.get("conteudo"), dados.get("anexoUrl"), dados.get("anexoNome")));
    }

    @GetMapping("/chat/{conversaId}/mensagens")
    public ResponseEntity<List<Mensagem>> listarMensagens(@PathVariable String conversaId) {
        return ResponseEntity.ok(chatService.listarMensagens(conversaId));
    }

    @GetMapping("/chat/conversas/{clienteId}")
    public ResponseEntity<List<Conversa>> listarConversas(@PathVariable String clienteId) {
        return ResponseEntity.ok(chatService.listarConversas(clienteId));
    }

    @GetMapping("/chat/abertas")
    public ResponseEntity<List<Conversa>> conversasAbertas() {
        return ResponseEntity.ok(chatService.listarConversasAbertas());
    }

    @PostMapping("/chat/{conversaId}/encerrar")
    public ResponseEntity<Conversa> encerrar(@PathVariable String conversaId) {
        return ResponseEntity.ok(chatService.encerrarConversa(conversaId));
    }

    // Notificações
    @GetMapping("/notificacoes/{destinatarioId}")
    public ResponseEntity<List<Notificacao>> notificacoes(
            @PathVariable String destinatarioId,
            @RequestParam(defaultValue = "false") boolean apenasNaoLidas) {
        return ResponseEntity.ok(chatService.listarNotificacoes(destinatarioId, apenasNaoLidas));
    }

    @PostMapping("/notificacoes/{destinatarioId}/marcar-lidas")
    public ResponseEntity<Void> marcarLidas(@PathVariable String destinatarioId) {
        chatService.marcarNotificacoesLidas(destinatarioId);
        return ResponseEntity.ok().build();
    }

    // Checklist
    @PostMapping("/checklist")
    public ResponseEntity<ChecklistCliente> criarChecklist(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(chatService.criarChecklistMensal(
                dados.get("clienteId"), dados.get("competencia")));
    }

    // Assinatura digital
    @PostMapping("/assinatura/solicitar")
    public ResponseEntity<AssinaturaDigital> solicitarAssinatura(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(chatService.solicitarAssinatura(
                dados.get("documentoId"), dados.get("documentoTitulo"),
                dados.get("clienteId"), dados.get("clienteNome")));
    }

    @PostMapping("/assinatura/{assinaturaId}/assinar")
    public ResponseEntity<AssinaturaDigital> assinar(
            @PathVariable String assinaturaId, @RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(chatService.assinar(assinaturaId, dados.get("ip")));
    }

    // Dashboard
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(chatService.dashboardPortal());
    }
}
