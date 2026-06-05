package br.com.bearerp.financeiroservice.interfaces.rest;

import br.com.bearerp.financeiroservice.application.dto.ContaBancariaResponse;
import br.com.bearerp.financeiroservice.application.dto.CreateContaBancariaRequest;
import br.com.bearerp.financeiroservice.application.dto.MovimentoBancarioResponse;
import br.com.bearerp.financeiroservice.application.usecase.ContaBancariaUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/v1/financeiro/contas-bancarias") @RequiredArgsConstructor
public class ContaBancariaController {
    private final ContaBancariaUseCase useCase;

    @GetMapping
    public List<ContaBancariaResponse> listar() {
        return useCase.listar();
    }

    @GetMapping("/todas")
    public List<ContaBancariaResponse> listarTodas() {
        return useCase.listarTodas();
    }

    @GetMapping("/{id}")
    public ContaBancariaResponse buscarPorId(@PathVariable String id) {
        return useCase.buscarPorId(id);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ContaBancariaResponse criar(@Valid @RequestBody CreateContaBancariaRequest request) {
        return useCase.criar(request);
    }

    @PutMapping("/{id}")
    public ContaBancariaResponse atualizar(@PathVariable String id, @Valid @RequestBody CreateContaBancariaRequest request) {
        return useCase.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public void desativar(@PathVariable String id) {
        useCase.desativar(id);
    }

    @GetMapping("/{id}/movimentos")
    public Page<MovimentoBancarioResponse> listarMovimentos(@PathVariable String id, Pageable pageable) {
        return useCase.listarMovimentos(id, pageable);
    }
}
