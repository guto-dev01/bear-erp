package br.com.bearerp.tributarioservice.interfaces.rest;

import br.com.bearerp.tributarioservice.application.usecase.LucroRealUseCase;
import br.com.bearerp.tributarioservice.domain.model.ApuracaoLucroReal;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/api/v1/tributario/lucro-real") @RequiredArgsConstructor
public class LucroRealController {
    private final LucroRealUseCase useCase;

    @PostMapping("/calcular")
    public ApuracaoLucroReal calcular(@RequestBody CalculoLucroRealRequest request) {
        return useCase.calcular(request.getPeriodo(), request.getTipoPeriodo(),
                request.getLucroContabil(), request.getAjustes(),
                request.getSaldoPrejuizoAnterior(), request.getSaldoBaseNegativaCsllAnterior(),
                request.getCreditosPisCofins());
    }

    @GetMapping("/{periodo}")
    public ApuracaoLucroReal consultar(@PathVariable String periodo) {
        return useCase.consultar(periodo);
    }

    @GetMapping
    public List<ApuracaoLucroReal> listar() {
        return useCase.listar();
    }

    @Data
    public static class CalculoLucroRealRequest {
        private String periodo;
        private ApuracaoLucroReal.TipoPeriodo tipoPeriodo;
        private BigDecimal lucroContabil;
        private List<ApuracaoLucroReal.AjusteLalur> ajustes;
        private BigDecimal saldoPrejuizoAnterior;
        private BigDecimal saldoBaseNegativaCsllAnterior;
        private BigDecimal creditosPisCofins;
    }
}
