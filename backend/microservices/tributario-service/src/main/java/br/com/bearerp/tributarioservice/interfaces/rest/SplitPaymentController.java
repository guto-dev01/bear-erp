package br.com.bearerp.tributarioservice.interfaces.rest;

import br.com.bearerp.tributarioservice.application.dto.*;
import br.com.bearerp.tributarioservice.application.usecase.SplitPaymentUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tributario/split-payment")
@RequiredArgsConstructor
@Tag(name = "Split Payment", description = "Simulador Split Payment IBS/CBS (Reforma Tributária)")
public class SplitPaymentController {

    private final SplitPaymentUseCase splitPaymentUseCase;

    @PostMapping("/simular")
    @Operation(summary = "Simular split payment")
    public ResponseEntity<SplitPaymentResponse> simular(@Valid @RequestBody CreateSplitPaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(splitPaymentUseCase.simular(request));
    }

    @GetMapping
    @Operation(summary = "Listar simulações")
    public ResponseEntity<List<SplitPaymentResponse>> list() {
        return ResponseEntity.ok(splitPaymentUseCase.list());
    }
}
