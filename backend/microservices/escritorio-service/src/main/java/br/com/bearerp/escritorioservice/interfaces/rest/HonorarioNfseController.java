package br.com.bearerp.escritorioservice.interfaces.rest;

import br.com.bearerp.escritorioservice.infrastructure.honorarios.HonorarioNfseService;
import br.com.bearerp.escritorioservice.infrastructure.honorarios.HonorarioNfseService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/escritorio/honorarios-nfse")
@RequiredArgsConstructor
public class HonorarioNfseController {

    private final HonorarioNfseService honorarioNfseService;

    @PostMapping("/contrato")
    public ResponseEntity<ContratoHonorario> criarContrato(@RequestBody ContratoHonorario contrato) {
        return ResponseEntity.ok(honorarioNfseService.criarContrato(contrato));
    }

    @PostMapping("/contrato/{contratoId}/assinar")
    public ResponseEntity<ContratoHonorario> assinarContrato(
            @PathVariable String contratoId, @RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(honorarioNfseService.assinarContrato(contratoId, dados.get("tipoAssinante")));
    }

    @PostMapping("/faturar")
    public ResponseEntity<HonorarioFaturamento> faturar(@RequestBody Map<String, String> dados) {
        ContratoHonorario contrato = new ContratoHonorario();
        contrato.setId(dados.get("contratoId"));
        return ResponseEntity.ok(honorarioNfseService.faturarHonorario(contrato, dados.get("competencia")));
    }

    @PostMapping("/faturamento/{faturamentoId}/emitir-nfse")
    public ResponseEntity<Void> emitirNfse(@PathVariable String faturamentoId) {
        HonorarioFaturamento fat = new HonorarioFaturamento();
        fat.setId(faturamentoId);
        honorarioNfseService.emitirNfseHonorario(fat);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/lucratividade")
    public ResponseEntity<List<LucratividadeCliente>> lucratividade() {
        return ResponseEntity.ok(honorarioNfseService.relatorioLucratividade());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(honorarioNfseService.dashboardHonorarios());
    }
}
