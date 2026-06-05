package br.com.bearerp.tenant.interfaces.rest;

import br.com.bearerp.tenant.application.usecase.AuditLogUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/sistema/auditoria")
@RequiredArgsConstructor
@Tag(name = "Auditoria", description = "Trilha de auditoria e logs do sistema")
public class AuditLogController {

    private final AuditLogUseCase auditLogUseCase;

    @GetMapping
    @Operation(summary = "Listar eventos de auditoria")
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false) String acao,
            @RequestParam(required = false) String modulo) {
        return ResponseEntity.ok(auditLogUseCase.listar(page, size, usuario, acao, modulo));
    }

    @GetMapping("/count-hoje")
    @Operation(summary = "Contar eventos de hoje")
    public ResponseEntity<Map<String, Long>> countHoje() {
        return ResponseEntity.ok(Map.of("count", auditLogUseCase.countHoje()));
    }

    @PostMapping
    @Operation(summary = "Registrar evento de auditoria")
    public ResponseEntity<Void> registrar(@RequestBody Map<String, String> body) {
        auditLogUseCase.registrar(
                body.get("usuario"), body.get("acao"), body.get("modulo"),
                body.get("descricao"), body.get("ip"), body.get("detalhes"));
        return ResponseEntity.ok().build();
    }
}
