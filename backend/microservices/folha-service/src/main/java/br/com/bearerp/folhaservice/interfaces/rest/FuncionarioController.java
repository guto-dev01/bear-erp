package br.com.bearerp.folhaservice.interfaces.rest;

import br.com.bearerp.folhaservice.application.dto.CreateFuncionarioRequest;
import br.com.bearerp.folhaservice.application.dto.FuncionarioResponse;
import br.com.bearerp.folhaservice.application.usecase.FuncionarioUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/folha/funcionarios")
@RequiredArgsConstructor
public class FuncionarioController {
    private final FuncionarioUseCase funcionarioUseCase;

    @PostMapping
    public ResponseEntity<FuncionarioResponse> criar(@Valid @RequestBody CreateFuncionarioRequest request) {
        return ResponseEntity.ok(funcionarioUseCase.criarFuncionario(request));
    }

    @GetMapping
    public ResponseEntity<Page<FuncionarioResponse>> listar(Pageable pageable) {
        return ResponseEntity.ok(funcionarioUseCase.listar(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FuncionarioResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(funcionarioUseCase.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FuncionarioResponse> update(@PathVariable String id, @Valid @RequestBody CreateFuncionarioRequest request) {
        return ResponseEntity.ok(funcionarioUseCase.updateFuncionario(id, request));
    }

    @PostMapping("/{id}/demitir")
    public ResponseEntity<FuncionarioResponse> demitir(@PathVariable String id) {
        return ResponseEntity.ok(funcionarioUseCase.demitir(id));
    }
}
