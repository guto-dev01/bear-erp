package br.com.bearerp.obrigacoes.interfaces.rest;

import br.com.bearerp.obrigacoes.application.usecase.AgendaFiscalUseCase;
import br.com.bearerp.obrigacoes.domain.model.AgendaFiscal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/obrigacoes/agenda")
@RequiredArgsConstructor
@Tag(name = "Agenda Fiscal", description = "Calendário automático de obrigações fiscais com alertas")
public class AgendaFiscalController {

    private final AgendaFiscalUseCase useCase;

    @PostMapping("/gerar")
    @Operation(summary = "Gerar agenda mensal para uma empresa")
    public ResponseEntity<List<AgendaFiscal>> gerarAgenda(@RequestBody Map<String, Object> body) {
        String empresaId = (String) body.get("empresaClienteId");
        String regime = (String) body.get("regimeTributario");
        int ano = (Integer) body.get("ano");
        int mes = (Integer) body.get("mes");
        return ResponseEntity.ok(useCase.gerarAgendaMensal(empresaId, regime, ano, mes));
    }

    @GetMapping("/proximos")
    @Operation(summary = "Consultar prazos próximos")
    public ResponseEntity<List<AgendaFiscal>> prazosProximos(@RequestParam(defaultValue = "7") int dias) {
        return ResponseEntity.ok(useCase.consultarPrazosProximos(dias));
    }

    @GetMapping("/atrasadas")
    @Operation(summary = "Consultar obrigações atrasadas")
    public ResponseEntity<List<AgendaFiscal>> atrasadas() {
        return ResponseEntity.ok(useCase.consultarAtrasadas());
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard de prazos fiscais")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(useCase.dashboardPrazos());
    }

    @PostMapping("/{id}/entregar")
    @Operation(summary = "Marcar obrigação como entregue")
    public ResponseEntity<AgendaFiscal> marcarEntregue(@PathVariable String id) {
        return ResponseEntity.ok(useCase.marcarEntregue(id));
    }
}
