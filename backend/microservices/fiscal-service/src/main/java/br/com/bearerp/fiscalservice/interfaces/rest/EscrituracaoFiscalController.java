package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.application.dto.CreateEscrituracaoRequest;
import br.com.bearerp.fiscalservice.application.dto.EscrituracaoFiscalResponse;
import br.com.bearerp.fiscalservice.application.usecase.EscrituracaoFiscalUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fiscal/escrituracao")
@RequiredArgsConstructor
public class EscrituracaoFiscalController {

    private final EscrituracaoFiscalUseCase escrituracaoUseCase;

    @PostMapping
    public ResponseEntity<EscrituracaoFiscalResponse> criar(@Valid @RequestBody CreateEscrituracaoRequest request) {
        return ResponseEntity.ok(escrituracaoUseCase.criarEscrituracao(request));
    }

    @GetMapping
    public ResponseEntity<List<EscrituracaoFiscalResponse>> listarPorPeriodo(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(escrituracaoUseCase.listarPorPeriodo(ano, mes));
    }

    @GetMapping("/tipo/{tipo}")
    public ResponseEntity<List<EscrituracaoFiscalResponse>> listarPorTipo(@PathVariable String tipo, @RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(escrituracaoUseCase.listarPorTipoEPeriodo(tipo, ano, mes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable String id) {
        escrituracaoUseCase.deletarEscrituracao(id);
        return ResponseEntity.noContent().build();
    }
}
