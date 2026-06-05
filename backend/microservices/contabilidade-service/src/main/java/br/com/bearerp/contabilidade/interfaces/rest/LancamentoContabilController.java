package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.*;
import br.com.bearerp.contabilidade.application.usecase.LancamentoContabilUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/contabilidade/lancamentos")
@RequiredArgsConstructor
@Tag(name = "Lançamentos Contábeis", description = "Gestão de lançamentos contábeis (partidas dobradas)")
public class LancamentoContabilController {

    private final LancamentoContabilUseCase lancamentoUseCase;

    @PostMapping
    @Operation(summary = "Criar lançamento contábil")
    public ResponseEntity<LancamentoResponse> create(@Valid @RequestBody CreateLancamentoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lancamentoUseCase.createLancamento(request));
    }

    @GetMapping
    @Operation(summary = "Listar lançamentos paginados")
    public ResponseEntity<Page<LancamentoResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(lancamentoUseCase.listLancamentos(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar lançamento por ID")
    public ResponseEntity<LancamentoResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(lancamentoUseCase.getLancamento(id));
    }

    @GetMapping("/periodo")
    @Operation(summary = "Listar por período de data")
    public ResponseEntity<List<LancamentoResponse>> listByPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        return ResponseEntity.ok(lancamentoUseCase.listByPeriodo(dataInicio, dataFim));
    }

    @GetMapping("/competencia")
    @Operation(summary = "Listar por competência")
    public ResponseEntity<List<LancamentoResponse>> listByCompetencia(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(lancamentoUseCase.listByCompetencia(ano, mes));
    }

    @GetMapping("/conta/{contaId}")
    @Operation(summary = "Listar lançamentos de uma conta")
    public ResponseEntity<List<LancamentoResponse>> listByConta(@PathVariable String contaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        return ResponseEntity.ok(lancamentoUseCase.listByConta(contaId, dataInicio, dataFim));
    }

    @PostMapping("/{id}/estornar")
    @Operation(summary = "Estornar lançamento")
    public ResponseEntity<LancamentoResponse> estornar(@PathVariable String id, @Valid @RequestBody EstornarLancamentoRequest request) {
        return ResponseEntity.ok(lancamentoUseCase.estornarLancamento(id, request));
    }
}
