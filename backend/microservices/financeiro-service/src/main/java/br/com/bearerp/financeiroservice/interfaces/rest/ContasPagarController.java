package br.com.bearerp.financeiroservice.interfaces.rest;

import br.com.bearerp.financeiroservice.application.dto.BaixarContaRequest;
import br.com.bearerp.financeiroservice.application.dto.ContaPagarResponse;
import br.com.bearerp.financeiroservice.application.dto.CreateContaPagarRequest;
import br.com.bearerp.financeiroservice.application.usecase.ContasPagarUseCase;
import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/v1/financeiro/contas-pagar") @RequiredArgsConstructor
public class ContasPagarController {
    private final ContasPagarUseCase useCase;

    @GetMapping
    public Page<ContaPagarResponse> listar(@RequestParam(required = false) ContaPagar.StatusConta status, Pageable pageable) {
        return useCase.listar(status, pageable);
    }

    @GetMapping("/{id}")
    public ContaPagarResponse buscarPorId(@PathVariable String id) {
        return useCase.buscarPorId(id);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ContaPagarResponse criar(@Valid @RequestBody CreateContaPagarRequest request) {
        return useCase.criar(request);
    }

    @PostMapping("/{id}/baixar")
    public ContaPagarResponse baixar(@PathVariable String id, @Valid @RequestBody BaixarContaRequest request) {
        return useCase.baixar(id, request);
    }

    @PostMapping("/{id}/cancelar")
    public void cancelar(@PathVariable String id) {
        useCase.cancelar(id);
    }

    @GetMapping("/vencidas")
    public List<ContaPagarResponse> listarVencidas() {
        return useCase.listarVencidas();
    }
}
