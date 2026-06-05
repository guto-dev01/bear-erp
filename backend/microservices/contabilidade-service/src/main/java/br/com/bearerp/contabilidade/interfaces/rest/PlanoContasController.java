package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.*;
import br.com.bearerp.contabilidade.application.usecase.PlanoContasUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/contabilidade/plano-contas")
@RequiredArgsConstructor
@Tag(name = "Plano de Contas", description = "Gestão do plano de contas contábil")
public class PlanoContasController {

    private final PlanoContasUseCase planoContasUseCase;

    @PostMapping
    @Operation(summary = "Criar conta contábil")
    public ResponseEntity<PlanoContasResponse> create(@Valid @RequestBody CreatePlanoContasRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(planoContasUseCase.createConta(request));
    }

    @GetMapping
    @Operation(summary = "Listar todas as contas")
    public ResponseEntity<List<PlanoContasResponse>> list() {
        return ResponseEntity.ok(planoContasUseCase.listContas());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar conta por ID")
    public ResponseEntity<PlanoContasResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(planoContasUseCase.getConta(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar conta")
    public ResponseEntity<PlanoContasResponse> update(@PathVariable String id, @Valid @RequestBody UpdatePlanoContasRequest request) {
        return ResponseEntity.ok(planoContasUseCase.updateConta(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir conta")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        planoContasUseCase.deleteConta(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/analiticas")
    @Operation(summary = "Listar contas analíticas")
    public ResponseEntity<List<PlanoContasResponse>> listAnaliticas() {
        return ResponseEntity.ok(planoContasUseCase.listContasAnaliticas());
    }

    @GetMapping("/arvore")
    @Operation(summary = "Plano de contas em árvore hierárquica")
    public ResponseEntity<List<PlanoContasResponse>> getArvore() {
        return ResponseEntity.ok(planoContasUseCase.getArvoreContas());
    }

    @GetMapping("/classificacao/{classificacao}")
    @Operation(summary = "Listar por classificação")
    public ResponseEntity<List<PlanoContasResponse>> listByClassificacao(@PathVariable String classificacao) {
        return ResponseEntity.ok(planoContasUseCase.listContasByClassificacao(classificacao));
    }

    @PostMapping("/importar-referencial")
    @Operation(summary = "Importar plano de contas referencial CFC/CPC")
    public ResponseEntity<List<PlanoContasResponse>> importReferencial() {
        return ResponseEntity.status(HttpStatus.CREATED).body(planoContasUseCase.importPlanoReferencial());
    }
}
