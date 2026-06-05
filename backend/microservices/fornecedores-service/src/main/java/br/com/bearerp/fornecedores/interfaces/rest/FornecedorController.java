package br.com.bearerp.fornecedores.interfaces.rest;

import br.com.bearerp.fornecedores.application.dto.*;
import br.com.bearerp.fornecedores.application.usecase.FornecedorUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fornecedores")
@RequiredArgsConstructor
@Tag(name = "Fornecedores", description = "Gestão de fornecedores")
public class FornecedorController {

    private final FornecedorUseCase fornecedorUseCase;

    @PostMapping
    @Operation(summary = "Cadastrar fornecedor")
    public ResponseEntity<FornecedorResponse> create(@Valid @RequestBody CreateFornecedorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fornecedorUseCase.create(request));
    }

    @GetMapping
    @Operation(summary = "Listar fornecedores")
    public ResponseEntity<List<FornecedorResponse>> list() {
        return ResponseEntity.ok(fornecedorUseCase.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar fornecedor por ID")
    public ResponseEntity<FornecedorResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(fornecedorUseCase.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar fornecedor")
    public ResponseEntity<FornecedorResponse> update(@PathVariable String id, @Valid @RequestBody CreateFornecedorRequest request) {
        return ResponseEntity.ok(fornecedorUseCase.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Desativar fornecedor")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        fornecedorUseCase.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/buscar")
    @Operation(summary = "Buscar fornecedores por nome, CNPJ/CPF")
    public ResponseEntity<List<FornecedorResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(fornecedorUseCase.search(q));
    }
}
