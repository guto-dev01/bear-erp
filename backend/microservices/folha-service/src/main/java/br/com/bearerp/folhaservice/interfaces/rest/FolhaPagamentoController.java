package br.com.bearerp.folhaservice.interfaces.rest;

import br.com.bearerp.folhaservice.application.dto.FolhaResumoResponse;
import br.com.bearerp.folhaservice.application.dto.HoleriteResponse;
import br.com.bearerp.folhaservice.application.usecase.CalculoFolhaUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/folha")
@RequiredArgsConstructor
public class FolhaPagamentoController {
    private final CalculoFolhaUseCase calculoFolhaUseCase;

    @PostMapping("/calcular")
    public ResponseEntity<FolhaResumoResponse> calcular(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(calculoFolhaUseCase.calcularFolha(ano, mes));
    }

    @PostMapping("/fechar")
    public ResponseEntity<FolhaResumoResponse> fechar(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(calculoFolhaUseCase.fecharFolha(ano, mes));
    }

    @GetMapping("/ano/{ano}")
    public ResponseEntity<List<FolhaResumoResponse>> listarFolhas(@PathVariable int ano) {
        return ResponseEntity.ok(calculoFolhaUseCase.listarFolhas(ano));
    }

    @GetMapping("/holerites")
    public ResponseEntity<List<HoleriteResponse>> listarHolerites(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(calculoFolhaUseCase.listarHolerites(ano, mes));
    }

    @GetMapping("/holerites/funcionario/{funcionarioId}")
    public ResponseEntity<List<HoleriteResponse>> holeritesFuncionario(@PathVariable String funcionarioId) {
        return ResponseEntity.ok(calculoFolhaUseCase.listarHoleritesFuncionario(funcionarioId));
    }
}
