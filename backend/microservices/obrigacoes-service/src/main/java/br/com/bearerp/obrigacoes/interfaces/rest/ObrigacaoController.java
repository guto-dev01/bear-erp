package br.com.bearerp.obrigacoes.interfaces.rest;

import br.com.bearerp.obrigacoes.application.dto.*;
import br.com.bearerp.obrigacoes.application.usecase.ObrigacaoUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/obrigacoes")
@RequiredArgsConstructor
@Tag(name = "Obrigações Acessórias", description = "Gestão de obrigações fiscais e acessórias")
public class ObrigacaoController {

    private final ObrigacaoUseCase obrigacaoUseCase;

    @PostMapping
    @Operation(summary = "Criar obrigação")
    public ResponseEntity<ObrigacaoResponse> create(@Valid @RequestBody CreateObrigacaoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(obrigacaoUseCase.create(request));
    }

    @GetMapping
    @Operation(summary = "Listar obrigações")
    public ResponseEntity<List<ObrigacaoResponse>> list() {
        return ResponseEntity.ok(obrigacaoUseCase.list());
    }

    @GetMapping("/competencia")
    @Operation(summary = "Listar por competência")
    public ResponseEntity<List<ObrigacaoResponse>> listByCompetencia(@RequestParam int mes, @RequestParam int ano) {
        return ResponseEntity.ok(obrigacaoUseCase.listarPorCompetencia(mes, ano));
    }

    @GetMapping("/pendentes")
    @Operation(summary = "Listar pendentes")
    public ResponseEntity<List<ObrigacaoResponse>> listPendentes() {
        return ResponseEntity.ok(obrigacaoUseCase.listarPendentes());
    }

    @PostMapping("/{id}/entregar")
    @Operation(summary = "Marcar como entregue")
    public ResponseEntity<ObrigacaoResponse> entregar(@PathVariable String id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(obrigacaoUseCase.marcarEntregue(id, body.getOrDefault("protocolo", "")));
    }

    @PostMapping("/gerar-calendario")
    @Operation(summary = "Gerar calendário de obrigações")
    public ResponseEntity<List<ObrigacaoResponse>> gerarCalendario(@RequestParam int mes, @RequestParam int ano) {
        return ResponseEntity.status(HttpStatus.CREATED).body(obrigacaoUseCase.gerarCalendarioMensal(mes, ano));
    }
}
