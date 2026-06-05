package br.com.bearerp.escritorioservice.interfaces.rest;

import br.com.bearerp.escritorioservice.application.usecase.PortalClienteUseCase;
import br.com.bearerp.escritorioservice.domain.model.ChecklistMensal;
import br.com.bearerp.escritorioservice.domain.model.PortalCliente;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/escritorio/portal")
@RequiredArgsConstructor
@Tag(name = "Portal do Cliente", description = "Portal para clientes do escritório contábil")
public class PortalClienteController {

    private final PortalClienteUseCase useCase;

    // === DOCUMENTOS ===

    @PostMapping("/documentos")
    @Operation(summary = "Enviar documento")
    public ResponseEntity<PortalCliente> enviarDocumento(
            @RequestParam String empresaClienteId,
            @RequestParam String tipo,
            @RequestParam String competencia,
            @RequestParam(required = false) String descricao,
            @RequestParam("arquivo") MultipartFile arquivo) {
        return ResponseEntity.ok(useCase.enviarDocumento(empresaClienteId, tipo, competencia, descricao, arquivo));
    }

    @PostMapping("/documentos/{id}/processar")
    @Operation(summary = "Marcar documento como processado")
    public ResponseEntity<PortalCliente> processar(@PathVariable String id,
                                                    @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(useCase.processarDocumento(id, body.get("observacao")));
    }

    @PostMapping("/documentos/{id}/devolver")
    @Operation(summary = "Devolver documento ao cliente")
    public ResponseEntity<PortalCliente> devolver(@PathVariable String id,
                                                   @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(useCase.devolverDocumento(id, body.get("motivo")));
    }

    @GetMapping("/documentos/empresa/{empresaClienteId}")
    @Operation(summary = "Listar documentos de uma empresa")
    public ResponseEntity<List<PortalCliente>> listarPorEmpresa(@PathVariable String empresaClienteId) {
        return ResponseEntity.ok(useCase.listarDocumentosPorEmpresa(empresaClienteId));
    }

    @GetMapping("/documentos/pendentes")
    @Operation(summary = "Listar documentos pendentes de processamento")
    public ResponseEntity<List<PortalCliente>> pendentes() {
        return ResponseEntity.ok(useCase.listarDocumentosPendentes());
    }

    // === MENSAGENS ===

    @PostMapping("/documentos/{id}/mensagem")
    @Operation(summary = "Enviar mensagem sobre documento")
    public ResponseEntity<PortalCliente> enviarMensagem(@PathVariable String id,
                                                         @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(useCase.enviarMensagem(id, body.get("conteudo"), body.get("autorNome")));
    }

    // === CHECKLIST ===

    @PostMapping("/checklist")
    @Operation(summary = "Gerar checklist mensal")
    public ResponseEntity<ChecklistMensal> gerarChecklist(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(useCase.gerarChecklist(body.get("empresaClienteId"), body.get("competencia")));
    }

    @PostMapping("/checklist/{id}/item/{indice}")
    @Operation(summary = "Marcar/desmarcar item do checklist")
    public ResponseEntity<ChecklistMensal> marcarItem(@PathVariable String id,
                                                       @PathVariable int indice,
                                                       @RequestParam boolean concluido) {
        return ResponseEntity.ok(useCase.marcarItemChecklist(id, indice, concluido));
    }

    @GetMapping("/checklist/empresa/{empresaClienteId}")
    @Operation(summary = "Listar checklists de uma empresa")
    public ResponseEntity<List<ChecklistMensal>> listarChecklists(@PathVariable String empresaClienteId) {
        return ResponseEntity.ok(useCase.listarChecklists(empresaClienteId));
    }
}
