package br.com.bearerp.nfeservice.interfaces.rest;

import br.com.bearerp.nfeservice.application.dto.*;
import br.com.bearerp.nfeservice.application.usecase.NfeUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/fiscal/nfe")
@RequiredArgsConstructor
@Tag(name = "NF-e", description = "Nota Fiscal Eletrônica")
public class NfeController {

    private final NfeUseCase nfeUseCase;

    @PostMapping
    @Operation(summary = "Criar NF-e")
    public ResponseEntity<NfeResponse> create(@Valid @RequestBody CreateNfeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(nfeUseCase.createNfe(request));
    }

    @GetMapping
    @Operation(summary = "Listar NF-e")
    public ResponseEntity<Page<NfeResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(nfeUseCase.listNfes(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar NF-e por ID")
    public ResponseEntity<NfeResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(nfeUseCase.getNfe(id));
    }

    @GetMapping("/tipo/{tipo}")
    @Operation(summary = "Listar NF-e por tipo (ENTRADA/SAIDA)")
    public ResponseEntity<Page<NfeResponse>> listByTipo(@PathVariable String tipo, Pageable pageable) {
        return ResponseEntity.ok(nfeUseCase.listByTipo(tipo, pageable));
    }

    @PostMapping("/{id}/autorizar")
    @Operation(summary = "Autorizar NF-e na SEFAZ")
    public ResponseEntity<NfeResponse> autorizar(@PathVariable String id) {
        return ResponseEntity.ok(nfeUseCase.autorizarNfe(id));
    }

    @PostMapping("/{id}/cancelar")
    @Operation(summary = "Cancelar NF-e")
    public ResponseEntity<NfeResponse> cancelar(@PathVariable String id, @RequestParam String motivo) {
        return ResponseEntity.ok(nfeUseCase.cancelarNfe(id, motivo));
    }
}
