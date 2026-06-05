package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.infrastructure.guias.GuiaAvancadaService;
import br.com.bearerp.fiscalservice.infrastructure.guias.GuiaAvancadaService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fiscal/guias-avancadas")
@RequiredArgsConstructor
public class GuiaAvancadaController {

    private final GuiaAvancadaService guiaAvancadaService;

    @PostMapping("/gerar")
    public ResponseEntity<GuiaUnificada> gerarGuia(@RequestBody GuiaAvancadaService.ParametrosGuia parametros) {
        return ResponseEntity.ok(guiaAvancadaService.gerarGuia(parametros));
    }

    @PostMapping("/{guiaId}/pagar")
    public ResponseEntity<GuiaUnificada> registrarPagamento(
            @PathVariable String guiaId,
            @RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(guiaAvancadaService.registrarPagamento(
                guiaId, dados.get("comprovante"), dados.get("banco")));
    }

    @GetMapping("/codigos-receita")
    public ResponseEntity<List<Map<String, String>>> listarCodigosReceita() {
        return ResponseEntity.ok(guiaAvancadaService.listarCodigosReceita());
    }
}
