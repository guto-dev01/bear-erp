package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.domain.model.Defis;
import br.com.bearerp.fiscalservice.infrastructure.defis.DefisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fiscal/defis")
@RequiredArgsConstructor
@Tag(name = "DEFIS", description = "Declaração de Informações Socioeconômicas e Fiscais - Simples Nacional")
public class DefisController {

    private final DefisService defisService;

    @PostMapping("/{ano}")
    @Operation(summary = "Criar declaração DEFIS")
    public ResponseEntity<Defis> criar(@PathVariable int ano) {
        return ResponseEntity.ok(defisService.criarDeclaracao(ano));
    }

    @PostMapping("/{id}/calcular")
    @Operation(summary = "Calcular automaticamente receitas a partir dos lançamentos")
    public ResponseEntity<Defis> calcular(@PathVariable String id) {
        return ResponseEntity.ok(defisService.calcularAutomatico(id));
    }

    @PostMapping("/{id}/validar")
    @Operation(summary = "Validar declaração")
    public ResponseEntity<Defis> validar(@PathVariable String id) {
        return ResponseEntity.ok(defisService.validar(id));
    }

    @GetMapping("/{id}/arquivo")
    @Operation(summary = "Gerar arquivo da declaração")
    public ResponseEntity<String> gerarArquivo(@PathVariable String id) {
        return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(defisService.gerarArquivo(id));
    }

    @PostMapping("/{id}/entregar")
    @Operation(summary = "Marcar como entregue")
    public ResponseEntity<Defis> marcarEntregue(@PathVariable String id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(defisService.marcarEntregue(id, body.get("protocolo"), body.get("recibo")));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar DEFIS")
    public ResponseEntity<Defis> consultar(@PathVariable String id) {
        return ResponseEntity.ok(defisService.buscar(id));
    }

    @GetMapping
    @Operation(summary = "Listar declarações DEFIS")
    public ResponseEntity<List<Defis>> listar() {
        return ResponseEntity.ok(defisService.listar());
    }
}
