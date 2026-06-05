package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.FecharPeriodoRequest;
import br.com.bearerp.contabilidade.application.dto.PeriodoContabilResponse;
import br.com.bearerp.contabilidade.application.usecase.PeriodoContabilUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/contabilidade/periodos")
@RequiredArgsConstructor
@Tag(name = "Períodos Contábeis", description = "Gestão de períodos contábeis")
public class PeriodoContabilController {

    private final PeriodoContabilUseCase periodoUseCase;

    @GetMapping("/{ano}")
    @Operation(summary = "Listar períodos do ano")
    public ResponseEntity<List<PeriodoContabilResponse>> listar(@PathVariable int ano) {
        return ResponseEntity.ok(periodoUseCase.listarPeriodos(ano));
    }

    @PostMapping("/fechar")
    @Operation(summary = "Fechar período contábil")
    public ResponseEntity<PeriodoContabilResponse> fechar(@Valid @RequestBody FecharPeriodoRequest request) {
        return ResponseEntity.ok(periodoUseCase.fecharPeriodo(request));
    }

    @PostMapping("/{ano}/{mes}/reabrir")
    @Operation(summary = "Reabrir período contábil")
    public ResponseEntity<PeriodoContabilResponse> reabrir(@PathVariable int ano, @PathVariable int mes) {
        return ResponseEntity.ok(periodoUseCase.reabrirPeriodo(ano, mes));
    }
}
