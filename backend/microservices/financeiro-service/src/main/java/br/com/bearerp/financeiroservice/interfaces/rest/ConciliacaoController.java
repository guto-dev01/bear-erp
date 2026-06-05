package br.com.bearerp.financeiroservice.interfaces.rest;

import br.com.bearerp.financeiroservice.application.dto.MovimentoBancarioResponse;
import br.com.bearerp.financeiroservice.application.usecase.ConciliacaoUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/api/v1/financeiro/conciliacao") @RequiredArgsConstructor
public class ConciliacaoController {
    private final ConciliacaoUseCase useCase;

    @GetMapping("/nao-conciliados/{contaBancariaId}")
    public List<MovimentoBancarioResponse> listarNaoConciliados(@PathVariable String contaBancariaId) {
        return useCase.listarNaoConciliados(contaBancariaId);
    }

    @GetMapping("/movimentos/{contaBancariaId}")
    public List<MovimentoBancarioResponse> listarPorPeriodo(
            @PathVariable String contaBancariaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return useCase.listarPorPeriodo(contaBancariaId, inicio, fim);
    }

    @PostMapping("/conciliar")
    public void conciliar(@RequestBody List<String> movimentoIds) {
        useCase.conciliar(movimentoIds);
    }

    @PostMapping("/desconciliar/{movimentoId}")
    public void desconciliar(@PathVariable String movimentoId) {
        useCase.desconciliar(movimentoId);
    }
}
