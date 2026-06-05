package br.com.bearerp.tributarioservice.interfaces.rest;

import br.com.bearerp.tributarioservice.application.usecase.SimplesNacionalUseCase;
import br.com.bearerp.tributarioservice.domain.model.ApuracaoSimples;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/api/v1/tributario/simples") @RequiredArgsConstructor
public class SimplesNacionalController {
    private final SimplesNacionalUseCase useCase;

    @PostMapping("/calcular")
    public ApuracaoSimples calcular(@RequestBody CalculoSimplesRequest request) {
        return useCase.calcular(request.getCompetencia(), request.getAnexo(),
                request.getReceitaBruta12Meses(), request.getReceitaBrutaMes());
    }

    @GetMapping("/{competencia}")
    public ApuracaoSimples consultar(@PathVariable String competencia) {
        return useCase.consultar(competencia);
    }

    @GetMapping
    public List<ApuracaoSimples> listar(@RequestParam String inicio, @RequestParam String fim) {
        return useCase.listar(inicio, fim);
    }

    @Data
    public static class CalculoSimplesRequest {
        private String competencia;
        private ApuracaoSimples.AnexoSimples anexo;
        private BigDecimal receitaBruta12Meses;
        private BigDecimal receitaBrutaMes;
    }
}
