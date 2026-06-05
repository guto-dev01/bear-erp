package br.com.bearerp.cte.interfaces.rest;

import br.com.bearerp.cte.application.dto.*;
import br.com.bearerp.cte.application.usecase.CteUseCase;
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
@RequestMapping("/api/v1/fiscal/cte")
@RequiredArgsConstructor
@Tag(name = "CT-e", description = "Conhecimento de Transporte Eletrônico")
public class CteController {

    private final CteUseCase cteUseCase;

    @PostMapping
    @Operation(summary = "Criar CT-e")
    public ResponseEntity<CteResponse> create(@Valid @RequestBody CreateCteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cteUseCase.create(request));
    }

    @GetMapping
    @Operation(summary = "Listar CT-e")
    public ResponseEntity<List<CteResponse>> list() {
        return ResponseEntity.ok(cteUseCase.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar CT-e por ID")
    public ResponseEntity<CteResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(cteUseCase.getById(id));
    }

    @PostMapping("/{id}/autorizar")
    @Operation(summary = "Autorizar CT-e")
    public ResponseEntity<CteResponse> autorizar(@PathVariable String id) {
        return ResponseEntity.ok(cteUseCase.autorizar(id));
    }

    @PostMapping("/{id}/cancelar")
    @Operation(summary = "Cancelar CT-e")
    public ResponseEntity<CteResponse> cancelar(@PathVariable String id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(cteUseCase.cancelar(id, body.getOrDefault("motivo", "")));
    }
}
