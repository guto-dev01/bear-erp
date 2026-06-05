package br.com.bearerp.empresa.interfaces.rest;

import br.com.bearerp.empresa.application.dto.CreateEmpresaRequest;
import br.com.bearerp.empresa.application.dto.EmpresaResponse;
import br.com.bearerp.empresa.application.usecase.EmpresaUseCase;
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
@RequestMapping("/api/v1/empresas")
@RequiredArgsConstructor
@Tag(name = "Empresas", description = "Gestão de empresas clientes")
public class EmpresaController {

    private final EmpresaUseCase empresaUseCase;

    @PostMapping
    @Operation(summary = "Cadastrar nova empresa")
    public ResponseEntity<EmpresaResponse> create(@Valid @RequestBody CreateEmpresaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(empresaUseCase.createEmpresa(request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar empresa por ID")
    public ResponseEntity<EmpresaResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(empresaUseCase.getEmpresa(id));
    }

    @GetMapping
    @Operation(summary = "Listar empresas do tenant")
    public ResponseEntity<Page<EmpresaResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(empresaUseCase.listEmpresas(pageable));
    }

    @GetMapping("/regime/{regime}")
    @Operation(summary = "Listar empresas por regime tributário")
    public ResponseEntity<Page<EmpresaResponse>> listByRegime(@PathVariable String regime, Pageable pageable) {
        return ResponseEntity.ok(empresaUseCase.listByRegime(regime, pageable));
    }
}
