package br.com.bearerp.esocialservice.interfaces.rest;

import br.com.bearerp.esocialservice.infrastructure.painel.EsocialPainelService;
import br.com.bearerp.esocialservice.infrastructure.painel.EsocialPainelService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/esocial/painel")
@RequiredArgsConstructor
public class EsocialPainelController {

    private final EsocialPainelService esocialPainelService;

    @GetMapping("/semaforo")
    public ResponseEntity<List<SemaforoEmpresa>> semaforo() {
        return ResponseEntity.ok(esocialPainelService.semaforoEscritorio());
    }

    @GetMapping("/timeline/{funcionarioId}")
    public ResponseEntity<TimelineFuncionario> timeline(@PathVariable String funcionarioId) {
        return ResponseEntity.ok(esocialPainelService.timelineFuncionario(funcionarioId));
    }

    @PostMapping("/reprocessar/{empresaId}")
    public ResponseEntity<Map<String, Object>> reprocessar(@PathVariable String empresaId) {
        return ResponseEntity.ok(esocialPainelService.reprocessarRejeitados(empresaId));
    }

    @PostMapping("/qualificar")
    public ResponseEntity<ResultadoQualificacao> qualificar(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(esocialPainelService.qualificarCadastro(
                dados.get("cpf"), dados.get("nome"), dados.get("nis")));
    }

    @GetMapping("/ferias-vencendo")
    public ResponseEntity<List<AlertaFerias>> feriasVencendo() {
        return ResponseEntity.ok(esocialPainelService.listarFeriasVencendo());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(esocialPainelService.dashboardEscritorio());
    }
}
