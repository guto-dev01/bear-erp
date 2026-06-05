package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.*;
import br.com.bearerp.contabilidade.application.usecase.RegrasContabilizacaoUseCase;
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
@RequestMapping("/api/v1/contabilidade/regras-contabilizacao")
@RequiredArgsConstructor
@Tag(name = "Regras de Contabilização", description = "Motor de regras para contabilização automática")
public class RegrasContabilizacaoController {

    private final RegrasContabilizacaoUseCase regrasUseCase;

    @PostMapping
    @Operation(summary = "Criar regra")
    public ResponseEntity<RegrasContabilizacaoResponse> create(@Valid @RequestBody CreateRegrasContabilizacaoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(regrasUseCase.create(request));
    }

    @GetMapping
    @Operation(summary = "Listar regras")
    public ResponseEntity<List<RegrasContabilizacaoResponse>> list() {
        return ResponseEntity.ok(regrasUseCase.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar regra por ID")
    public ResponseEntity<RegrasContabilizacaoResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(regrasUseCase.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar regra")
    public ResponseEntity<RegrasContabilizacaoResponse> update(@PathVariable String id, @Valid @RequestBody CreateRegrasContabilizacaoRequest request) {
        return ResponseEntity.ok(regrasUseCase.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir regra")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        regrasUseCase.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Ativar/Desativar regra")
    public ResponseEntity<RegrasContabilizacaoResponse> toggle(@PathVariable String id) {
        return ResponseEntity.ok(regrasUseCase.toggleAtiva(id));
    }

    @PostMapping("/executar")
    @Operation(summary = "Executar regras ativas e gerar lançamentos")
    public ResponseEntity<List<Map<String, Object>>> executar() {
        return ResponseEntity.ok(regrasUseCase.executarRegras());
    }
}
