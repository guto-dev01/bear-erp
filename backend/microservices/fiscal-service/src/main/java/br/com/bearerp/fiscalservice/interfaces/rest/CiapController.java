package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.application.dto.CiapResponse;
import br.com.bearerp.fiscalservice.application.dto.CreateCiapRequest;
import br.com.bearerp.fiscalservice.application.usecase.CiapUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fiscal/ciap")
@RequiredArgsConstructor
public class CiapController {

    private final CiapUseCase ciapUseCase;

    @PostMapping
    public ResponseEntity<CiapResponse> criar(@Valid @RequestBody CreateCiapRequest request) {
        return ResponseEntity.ok(ciapUseCase.criarCiap(request));
    }

    @GetMapping
    public ResponseEntity<List<CiapResponse>> listar() {
        return ResponseEntity.ok(ciapUseCase.listar());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<CiapResponse>> listarPorStatus(@PathVariable String status) {
        return ResponseEntity.ok(ciapUseCase.listarPorStatus(status));
    }

    @PostMapping("/{id}/apropriar")
    public ResponseEntity<CiapResponse> apropriarParcela(@PathVariable String id) {
        return ResponseEntity.ok(ciapUseCase.apropriarParcela(id));
    }
}
