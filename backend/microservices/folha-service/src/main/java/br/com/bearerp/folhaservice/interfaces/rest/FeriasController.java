package br.com.bearerp.folhaservice.interfaces.rest;

import br.com.bearerp.folhaservice.application.dto.*;
import br.com.bearerp.folhaservice.application.usecase.FeriasUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/folha/ferias")
@RequiredArgsConstructor
@Tag(name = "Férias", description = "Cálculo e gestão de férias")
public class FeriasController {

    private final FeriasUseCase feriasUseCase;

    @PostMapping("/calcular")
    @Operation(summary = "Calcular férias")
    public ResponseEntity<FeriasResponse> calcular(@Valid @RequestBody CreateFeriasRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(feriasUseCase.calcular(request));
    }

    @GetMapping
    @Operation(summary = "Listar férias")
    public ResponseEntity<List<FeriasResponse>> list() {
        return ResponseEntity.ok(feriasUseCase.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar férias por ID")
    public ResponseEntity<FeriasResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(feriasUseCase.getById(id));
    }

    @PostMapping("/{id}/aprovar")
    @Operation(summary = "Aprovar férias")
    public ResponseEntity<FeriasResponse> aprovar(@PathVariable String id) {
        return ResponseEntity.ok(feriasUseCase.aprovar(id));
    }
}
