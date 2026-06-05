package br.com.bearerp.tenant.interfaces.rest;

import br.com.bearerp.tenant.application.dto.CreateTenantRequest;
import br.com.bearerp.tenant.application.dto.TenantResponse;
import br.com.bearerp.tenant.application.dto.UpdateTenantRequest;
import br.com.bearerp.tenant.application.usecase.TenantUseCase;
import br.com.bearerp.tenant.domain.model.Office;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
@Tag(name = "Tenants", description = "Gestão de escritórios contábeis (tenants)")
public class TenantController {

    private final TenantUseCase tenantUseCase;

    @PostMapping
    @Operation(summary = "Criar novo tenant")
    public ResponseEntity<TenantResponse> create(@Valid @RequestBody CreateTenantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tenantUseCase.createTenant(request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar tenant por ID")
    public ResponseEntity<TenantResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(tenantUseCase.getTenant(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar tenant")
    public ResponseEntity<TenantResponse> update(@PathVariable String id, @Valid @RequestBody UpdateTenantRequest request) {
        return ResponseEntity.ok(tenantUseCase.updateTenant(id, request));
    }

    @GetMapping
    @Operation(summary = "Listar todos os tenants")
    public ResponseEntity<Page<TenantResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(tenantUseCase.listTenants(pageable));
    }

    @GetMapping("/{tenantId}/offices")
    @Operation(summary = "Listar filiais do tenant")
    public ResponseEntity<List<Office>> listOffices(@PathVariable String tenantId) {
        return ResponseEntity.ok(tenantUseCase.listOffices(tenantId));
    }
}
