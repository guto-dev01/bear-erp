package br.com.bearerp.patrimonioservice.interfaces.rest;

import br.com.bearerp.patrimonioservice.application.dto.DepreciacaoResponse;
import br.com.bearerp.patrimonioservice.application.usecase.DepreciacaoUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/v1/patrimonio/depreciacao") @RequiredArgsConstructor
public class DepreciacaoController {
    private final DepreciacaoUseCase useCase;

    @PostMapping("/calcular/{competencia}")
    public List<DepreciacaoResponse> calcular(@PathVariable String competencia) {
        return useCase.calcularDepreciacaoMensal(competencia);
    }

    @GetMapping("/bem/{bemId}")
    public List<DepreciacaoResponse> listarPorBem(@PathVariable String bemId) {
        return useCase.listarPorBem(bemId);
    }

    @GetMapping("/competencia/{competencia}")
    public List<DepreciacaoResponse> listarPorCompetencia(@PathVariable String competencia) {
        return useCase.listarPorCompetencia(competencia);
    }
}
