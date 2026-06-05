package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.integracoesservice.infrastructure.nferobo.NfeRoboService;
import br.com.bearerp.integracoesservice.infrastructure.nferobo.NfeRoboService.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/integracoes/nfe-robo")
@RequiredArgsConstructor
@Tag(name = "NF-e Robot", description = "Busca automatizada de NF-e/NFS-e/CT-e — supera Calima BOX")
public class NfeRoboController {

    private final NfeRoboService service;

    @PostMapping("/configurar")
    @Operation(summary = "Configurar busca automática para uma empresa")
    public ResponseEntity<NfeRoboConfig> configurar(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.configurar(
                (String) body.get("cnpjEmpresa"),
                (String) body.get("certificadoId"),
                body));
    }

    @PostMapping("/{configId}/pausar")
    @Operation(summary = "Pausar busca automática")
    public ResponseEntity<NfeRoboConfig> pausar(@PathVariable String configId) {
        return ResponseEntity.ok(service.pausar(configId));
    }

    @PostMapping("/{configId}/reativar")
    @Operation(summary = "Reativar busca automática")
    public ResponseEntity<NfeRoboConfig> reativar(@PathVariable String configId) {
        return ResponseEntity.ok(service.reativar(configId));
    }

    @PostMapping("/{configId}/executar")
    @Operation(summary = "Executar busca manual imediata")
    public ResponseEntity<Map<String, Object>> executarManual(@PathVariable String configId) {
        return ResponseEntity.ok(service.executarBuscaManual(configId));
    }

    @PostMapping("/notas/{notaId}/manifestar")
    @Operation(summary = "Manifestar ciência/confirmação de NF-e")
    public ResponseEntity<NotaCapturada> manifestar(@PathVariable String notaId,
                                                      @RequestParam TipoManifestacao tipo) {
        return ResponseEntity.ok(service.manifestar(notaId, tipo));
    }

    @GetMapping("/configuracoes")
    @Operation(summary = "Listar configurações de busca automática")
    public ResponseEntity<List<NfeRoboConfig>> listarConfigs() {
        return ResponseEntity.ok(service.listarConfiguracoes());
    }

    @GetMapping("/{configId}/notas")
    @Operation(summary = "Listar notas capturadas")
    public ResponseEntity<List<NotaCapturada>> listarNotas(@PathVariable String configId,
                                                             @RequestParam(required = false) String dataInicio,
                                                             @RequestParam(required = false) String dataFim) {
        return ResponseEntity.ok(service.listarNotas(configId, dataInicio, dataFim));
    }

    @GetMapping("/{configId}/pendentes")
    @Operation(summary = "Listar notas pendentes de contabilização")
    public ResponseEntity<List<NotaCapturada>> listarPendentes(@PathVariable String configId) {
        return ResponseEntity.ok(service.listarPendentes(configId));
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard do NF-e Robot")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(service.dashboard());
    }
}
