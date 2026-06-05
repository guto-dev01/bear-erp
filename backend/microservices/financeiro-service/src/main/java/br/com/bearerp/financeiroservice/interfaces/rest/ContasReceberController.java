package br.com.bearerp.financeiroservice.interfaces.rest;

import br.com.bearerp.financeiroservice.application.dto.BaixarContaRequest;
import br.com.bearerp.financeiroservice.application.dto.ContaReceberResponse;
import br.com.bearerp.financeiroservice.application.dto.CreateContaReceberRequest;
import br.com.bearerp.financeiroservice.application.usecase.ContasReceberUseCase;
import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/v1/financeiro/contas-receber") @RequiredArgsConstructor
public class ContasReceberController {
    private final ContasReceberUseCase useCase;

    @GetMapping
    public Page<ContaReceberResponse> listar(@RequestParam(required = false) ContaPagar.StatusConta status, Pageable pageable) {
        return useCase.listar(status, pageable);
    }

    @GetMapping("/{id}")
    public ContaReceberResponse buscarPorId(@PathVariable String id) {
        return useCase.buscarPorId(id);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ContaReceberResponse criar(@Valid @RequestBody CreateContaReceberRequest request) {
        return useCase.criar(request);
    }

    @PostMapping("/{id}/baixar")
    public ContaReceberResponse baixar(@PathVariable String id, @Valid @RequestBody BaixarContaRequest request) {
        return useCase.baixar(id, request);
    }

    @PostMapping("/{id}/cancelar")
    public void cancelar(@PathVariable String id) {
        useCase.cancelar(id);
    }

    @GetMapping("/vencidas")
    public List<ContaReceberResponse> listarVencidas() {
        return useCase.listarVencidas();
    }
}
