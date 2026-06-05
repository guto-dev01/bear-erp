package br.com.bearerp.escritorioservice.interfaces.rest;

import br.com.bearerp.escritorioservice.application.usecase.ProtocoloDocumentoUseCase;
import br.com.bearerp.escritorioservice.domain.model.ProtocoloDocumento;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/escritorio/protocolos")
@RequiredArgsConstructor
@Tag(name = "Protocolos", description = "Controle de protocolos de documentos com QR Code e rastreamento")
public class ProtocoloDocumentoController {

    private final ProtocoloDocumentoUseCase useCase;

    @PostMapping
    @Operation(summary = "Registrar protocolo de entrada/saída")
    public ResponseEntity<ProtocoloDocumento> registrar(@RequestBody ProtocoloDocumento protocolo) {
        return ResponseEntity.ok(useCase.registrar(protocolo));
    }

    @PostMapping("/{id}/analise")
    @Operation(summary = "Mover para análise")
    public ResponseEntity<ProtocoloDocumento> analisar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.moverParaAnalise(id));
    }

    @PostMapping("/{id}/processar")
    @Operation(summary = "Marcar como processado")
    public ResponseEntity<ProtocoloDocumento> processar(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(useCase.marcarProcessado(id, body != null ? body.get("observacao") : null));
    }

    @PostMapping("/{id}/devolver")
    @Operation(summary = "Devolver documento ao cliente")
    public ResponseEntity<ProtocoloDocumento> devolver(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(useCase.devolver(id, body != null ? body.get("responsavel") : null));
    }

    @PostMapping("/{id}/arquivar")
    @Operation(summary = "Arquivar protocolo")
    public ResponseEntity<ProtocoloDocumento> arquivar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.arquivar(id));
    }

    @GetMapping("/consulta/{numero}")
    @Operation(summary = "Consultar protocolo por número (via QR Code)")
    public ResponseEntity<ProtocoloDocumento> consultar(@PathVariable String numero) {
        ProtocoloDocumento p = useCase.consultarPorNumero(numero);
        if (p == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(p);
    }

    @GetMapping("/empresa/{empresaClienteId}")
    @Operation(summary = "Listar protocolos por empresa")
    public ResponseEntity<List<ProtocoloDocumento>> porEmpresa(@PathVariable String empresaClienteId) {
        return ResponseEntity.ok(useCase.listarPorEmpresa(empresaClienteId));
    }

    @GetMapping("/pendentes")
    @Operation(summary = "Listar protocolos pendentes")
    public ResponseEntity<List<ProtocoloDocumento>> pendentes() {
        return ResponseEntity.ok(useCase.listarPendentes());
    }

    @GetMapping("/atrasados")
    @Operation(summary = "Listar protocolos com prazo vencido")
    public ResponseEntity<List<ProtocoloDocumento>> atrasados() {
        return ResponseEntity.ok(useCase.listarAtrasados());
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard de protocolos")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(useCase.dashboard());
    }
}
