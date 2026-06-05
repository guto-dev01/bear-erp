package br.com.bearerp.escritorioservice.interfaces.rest;

import br.com.bearerp.escritorioservice.infrastructure.cobranca.ReguaCobrancaService;
import br.com.bearerp.escritorioservice.infrastructure.cobranca.ReguaCobrancaService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/escritorio/cobranca")
@RequiredArgsConstructor
public class ReguaCobrancaController {

    private final ReguaCobrancaService reguaCobrancaService;

    @PostMapping("/executar")
    public ResponseEntity<Void> executarManual() {
        reguaCobrancaService.executarReguaCobranca();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/score/{clienteId}")
    public ResponseEntity<ScoreCliente> scoreCliente(@PathVariable String clienteId) {
        return ResponseEntity.ok(reguaCobrancaService.calcularScoreCliente(clienteId));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(reguaCobrancaService.dashboardFinanceiroEscritorio());
    }
}
