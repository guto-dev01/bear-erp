package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.*;
import br.com.bearerp.contabilidade.application.usecase.CentroCustoUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/contabilidade/centros-custo")
@RequiredArgsConstructor
@Tag(name = "Centros de Custo", description = "Gestão de centros de custo")
public class CentroCustoController {

    private final CentroCustoUseCase centroCustoUseCase;

    @PostMapping
    @Operation(summary = "Criar centro de custo")
    public ResponseEntity<CentroCustoResponse> create(@Valid @RequestBody CreateCentroCustoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(centroCustoUseCase.create(request));
    }

    @GetMapping
    @Operation(summary = "Listar centros de custo")
    public ResponseEntity<List<CentroCustoResponse>> list() {
        return ResponseEntity.ok(centroCustoUseCase.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar centro de custo por ID")
    public ResponseEntity<CentroCustoResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(centroCustoUseCase.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar centro de custo")
    public ResponseEntity<CentroCustoResponse> update(@PathVariable String id, @Valid @RequestBody CreateCentroCustoRequest request) {
        return ResponseEntity.ok(centroCustoUseCase.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Desativar centro de custo")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        centroCustoUseCase.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/arvore")
    @Operation(summary = "Centros de custo em árvore")
    public ResponseEntity<List<CentroCustoResponse>> getArvore() {
        return ResponseEntity.ok(centroCustoUseCase.getArvore());
    }
}
