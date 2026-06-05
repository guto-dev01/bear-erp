package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.DreResponse;
import br.com.bearerp.contabilidade.application.usecase.DreUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contabilidade/dre")
@RequiredArgsConstructor
@Tag(name = "DRE", description = "Demonstração do Resultado do Exercício")
public class DreController {

    private final DreUseCase dreUseCase;

    @GetMapping
    @Operation(summary = "Gerar DRE")
    public ResponseEntity<DreResponse> gerar(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(dreUseCase.gerarDre(ano, mes));
    }
}
