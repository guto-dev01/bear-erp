package br.com.bearerp.folhaservice.interfaces.rest;

import br.com.bearerp.folhaservice.infrastructure.simulacao.FolhaSimulacaoService;
import br.com.bearerp.folhaservice.infrastructure.simulacao.FolhaSimulacaoService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/folha/simulacao")
@RequiredArgsConstructor
public class FolhaSimulacaoController {

    private final FolhaSimulacaoService folhaSimulacaoService;

    @GetMapping("/{empresaId}")
    public ResponseEntity<SimulacaoFolha> simular(
            @PathVariable String empresaId, @RequestParam String competencia) {
        return ResponseEntity.ok(folhaSimulacaoService.simularFolha(empresaId, competencia));
    }

    @GetMapping("/provisoes/{empresaId}")
    public ResponseEntity<ProvisaoFolha> provisoes(
            @PathVariable String empresaId, @RequestParam String competencia) {
        return ResponseEntity.ok(folhaSimulacaoService.calcularProvisoes(empresaId, competencia));
    }

    @PostMapping("/importar-afd")
    public ResponseEntity<List<RegistroPonto>> importarAfd(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(folhaSimulacaoService.importarAfd(dados.get("conteudo")));
    }

    @GetMapping("/dashboard/{empresaId}")
    public ResponseEntity<Map<String, Object>> dashboard(
            @PathVariable String empresaId, @RequestParam String competencia) {
        return ResponseEntity.ok(folhaSimulacaoService.dashboardFolha(empresaId, competencia));
    }
}
