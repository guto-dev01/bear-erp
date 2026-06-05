package br.com.bearerp.financeiroservice.interfaces.rest;

import br.com.bearerp.financeiroservice.application.dto.FluxoCaixaResponse;
import br.com.bearerp.financeiroservice.application.usecase.FluxoCaixaUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController @RequestMapping("/api/v1/financeiro/fluxo-caixa") @RequiredArgsConstructor
public class FluxoCaixaController {
    private final FluxoCaixaUseCase useCase;

    @GetMapping
    public FluxoCaixaResponse gerarFluxoCaixa(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        return useCase.gerarFluxoCaixa(dataInicio, dataFim);
    }
}
