package br.com.bearerp.lancamentosservice.interfaces.rest;

import br.com.bearerp.lancamentosservice.infrastructure.recorrente.LancamentoRecorrenteService;
import br.com.bearerp.lancamentosservice.infrastructure.recorrente.LancamentoRecorrenteService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/lancamentos/recorrentes")
@RequiredArgsConstructor
public class LancamentoRecorrenteController {

    private final LancamentoRecorrenteService recorrenteService;

    @PostMapping
    public ResponseEntity<LancamentoRecorrente> criar(@RequestBody LancamentoRecorrente lancamento) {
        return ResponseEntity.ok(recorrenteService.criarRecorrente(lancamento));
    }

    @PostMapping("/{id}/pausar")
    public ResponseEntity<LancamentoRecorrente> pausar(@PathVariable String id) {
        return ResponseEntity.ok(recorrenteService.pausar(id));
    }

    @PostMapping("/{id}/reativar")
    public ResponseEntity<LancamentoRecorrente> reativar(@PathVariable String id) {
        return ResponseEntity.ok(recorrenteService.reativar(id));
    }

    @PostMapping("/executar")
    public ResponseEntity<Void> executarManual() {
        recorrenteService.executarLancamentosRecorrentes();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/duplicar-mes")
    public ResponseEntity<List<Map<String, Object>>> duplicarMes(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(recorrenteService.duplicarLancamentosMesAnterior(
                dados.get("competenciaOrigem"), dados.get("competenciaDestino")));
    }
}
