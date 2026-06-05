package br.com.bearerp.tributarioservice.interfaces.rest;

import br.com.bearerp.tributarioservice.infrastructure.simulador.SimuladorRegimeService;
import br.com.bearerp.tributarioservice.infrastructure.simulador.SimuladorRegimeService.SimulacaoRegime;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tributario/simulador")
@RequiredArgsConstructor
@Tag(name = "Simulador Tributário", description = "Simula Simples x Presumido x Real e recomenda o melhor regime")
public class SimuladorRegimeController {

    private final SimuladorRegimeService service;

    @PostMapping("/simular")
    @Operation(summary = "Simular regime tributário — compara Simples x Presumido x Real")
    public ResponseEntity<SimulacaoRegime> simular(@RequestBody Map<String, Object> dados) {
        return ResponseEntity.ok(service.simular(dados));
    }

    @GetMapping("/historico")
    @Operation(summary = "Listar simulações anteriores")
    public ResponseEntity<List<SimulacaoRegime>> historico() {
        return ResponseEntity.ok(service.listarSimulacoes());
    }
}
