package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.BalanceteResponse;
import br.com.bearerp.contabilidade.application.usecase.BalanceteUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contabilidade/balancete")
@RequiredArgsConstructor
@Tag(name = "Balancete", description = "Balancete de Verificação")
public class BalanceteController {

    private final BalanceteUseCase balanceteUseCase;

    @GetMapping
    @Operation(summary = "Gerar balancete de verificação")
    public ResponseEntity<BalanceteResponse> gerar(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(balanceteUseCase.gerarBalancete(ano, mes));
    }
}
