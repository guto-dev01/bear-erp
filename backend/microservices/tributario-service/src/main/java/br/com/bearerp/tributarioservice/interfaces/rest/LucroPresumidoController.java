package br.com.bearerp.tributarioservice.interfaces.rest;

import br.com.bearerp.tributarioservice.application.usecase.LucroPresumidoUseCase;
import br.com.bearerp.tributarioservice.domain.model.ApuracaoLucroPresumido;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/api/v1/tributario/lucro-presumido") @RequiredArgsConstructor
public class LucroPresumidoController {
    private final LucroPresumidoUseCase useCase;

    @PostMapping("/calcular")
    public ApuracaoLucroPresumido calcular(@RequestBody CalculoPresumidoRequest request) {
        return useCase.calcular(request.getTrimestre(), request.getTipoAtividade(),
                request.getReceitaBrutaTrimestre(), request.getDemaisReceitas());
    }

    @GetMapping("/{trimestre}")
    public ApuracaoLucroPresumido consultar(@PathVariable String trimestre) {
        return useCase.consultar(trimestre);
    }

    @GetMapping
    public List<ApuracaoLucroPresumido> listar() {
        return useCase.listar();
    }

    @Data
    public static class CalculoPresumidoRequest {
        private String trimestre;
        private ApuracaoLucroPresumido.TipoAtividade tipoAtividade;
        private BigDecimal receitaBrutaTrimestre;
        private BigDecimal demaisReceitas;
    }
}
