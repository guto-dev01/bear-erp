package br.com.bearerp.folhaservice.interfaces.rest;

import br.com.bearerp.folhaservice.application.dto.*;
import br.com.bearerp.folhaservice.application.usecase.RescisaoUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/folha/rescisao")
@RequiredArgsConstructor
@Tag(name = "Rescisão", description = "Cálculo rescisório CLT")
public class RescisaoController {

    private final RescisaoUseCase rescisaoUseCase;

    @PostMapping("/calcular")
    @Operation(summary = "Calcular rescisão")
    public ResponseEntity<RescisaoResponse> calcular(@Valid @RequestBody CreateRescisaoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rescisaoUseCase.calcular(request));
    }

    @GetMapping
    @Operation(summary = "Listar rescisões")
    public ResponseEntity<List<RescisaoResponse>> list() {
        return ResponseEntity.ok(rescisaoUseCase.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar rescisão por ID")
    public ResponseEntity<RescisaoResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(rescisaoUseCase.getById(id));
    }

    @PostMapping("/{id}/homologar")
    @Operation(summary = "Homologar rescisão")
    public ResponseEntity<RescisaoResponse> homologar(@PathVariable String id) {
        return ResponseEntity.ok(rescisaoUseCase.homologar(id));
    }
}
