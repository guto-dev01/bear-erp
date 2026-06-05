package br.com.bearerp.reinfservice.interfaces.rest;

import br.com.bearerp.reinfservice.infrastructure.painel.ReinfPainelService;
import br.com.bearerp.reinfservice.infrastructure.painel.ReinfPainelService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reinf/painel")
@RequiredArgsConstructor
public class ReinfPainelController {

    private final ReinfPainelService reinfPainelService;

    @GetMapping("/nfse-retencao/{empresaId}")
    public ResponseEntity<List<NfseComRetencao>> nfseComRetencao(
            @PathVariable String empresaId, @RequestParam String competencia) {
        return ResponseEntity.ok(reinfPainelService.importarNfseComRetencao(empresaId, competencia));
    }

    @GetMapping("/cruzamento/{empresaId}")
    public ResponseEntity<CruzamentoReinfDctf> cruzamento(
            @PathVariable String empresaId, @RequestParam String competencia) {
        return ResponseEntity.ok(reinfPainelService.cruzarReinfDctf(empresaId, competencia));
    }

    @PostMapping("/retificar/{empresaId}")
    public ResponseEntity<Map<String, Object>> retificar(
            @PathVariable String empresaId, @RequestParam String competencia) {
        return ResponseEntity.ok(reinfPainelService.retificarEmLote(empresaId, competencia));
    }

    @GetMapping("/timeline/{empresaId}")
    public ResponseEntity<List<EventoReinf>> timeline(
            @PathVariable String empresaId, @RequestParam String competencia) {
        return ResponseEntity.ok(reinfPainelService.timelineEmpresa(empresaId, competencia));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(reinfPainelService.dashboardEscritorio());
    }
}
