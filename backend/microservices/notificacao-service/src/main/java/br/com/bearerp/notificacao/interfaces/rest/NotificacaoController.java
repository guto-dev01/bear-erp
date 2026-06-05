package br.com.bearerp.notificacao.interfaces.rest;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.notificacao.application.service.NotificacaoService;
import br.com.bearerp.notificacao.domain.model.Notificacao;
import br.com.bearerp.notificacao.domain.model.Notificacao.CategoriaNotificacao;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notificacoes")
@RequiredArgsConstructor
@Tag(name = "Notificações", description = "Envio e gestão de notificações")
public class NotificacaoController {

    private final NotificacaoService notificacaoService;

    @PostMapping
    @Operation(summary = "Enviar notificação")
    public ResponseEntity<Notificacao> enviar(@RequestBody Map<String, String> body) {
        String tenantId = TenantContext.getTenantId();
        Notificacao n = notificacaoService.enviar(tenantId,
                body.get("email"), body.get("nome"), body.get("assunto"),
                body.getOrDefault("template", "generico"),
                CategoriaNotificacao.valueOf(body.getOrDefault("categoria", "SISTEMA")),
                Map.of("mensagem", body.getOrDefault("mensagem", "")));
        return ResponseEntity.ok(n);
    }

    @GetMapping
    @Operation(summary = "Listar notificações")
    public ResponseEntity<Page<Notificacao>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String tenantId = TenantContext.getTenantId();
        return ResponseEntity.ok(notificacaoService.listar(tenantId, page, size));
    }

    @PostMapping("/{id}/reenviar")
    @Operation(summary = "Reenviar notificação com falha")
    public ResponseEntity<Notificacao> reenviar(@PathVariable String id) {
        return ResponseEntity.ok(notificacaoService.reenviar(id));
    }

    @GetMapping("/pendentes")
    @Operation(summary = "Listar notificações pendentes")
    public ResponseEntity<List<Notificacao>> pendentes() {
        return ResponseEntity.ok(notificacaoService.listarPendentes());
    }
}
