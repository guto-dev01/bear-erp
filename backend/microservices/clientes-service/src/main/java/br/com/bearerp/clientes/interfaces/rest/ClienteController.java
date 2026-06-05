package br.com.bearerp.clientes.interfaces.rest;

import br.com.bearerp.clientes.application.dto.*;
import br.com.bearerp.clientes.application.usecase.ClienteUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
@Tag(name = "Clientes", description = "Gestão de clientes")
public class ClienteController {

    private final ClienteUseCase clienteUseCase;

    @PostMapping
    @Operation(summary = "Cadastrar cliente")
    public ResponseEntity<ClienteResponse> create(@Valid @RequestBody CreateClienteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteUseCase.create(request));
    }

    @GetMapping
    @Operation(summary = "Listar clientes")
    public ResponseEntity<List<ClienteResponse>> list() {
        return ResponseEntity.ok(clienteUseCase.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar cliente por ID")
    public ResponseEntity<ClienteResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(clienteUseCase.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar cliente")
    public ResponseEntity<ClienteResponse> update(@PathVariable String id, @Valid @RequestBody CreateClienteRequest request) {
        return ResponseEntity.ok(clienteUseCase.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Desativar cliente")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        clienteUseCase.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/buscar")
    @Operation(summary = "Buscar clientes por nome, CNPJ/CPF")
    public ResponseEntity<List<ClienteResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(clienteUseCase.search(q));
    }
}
