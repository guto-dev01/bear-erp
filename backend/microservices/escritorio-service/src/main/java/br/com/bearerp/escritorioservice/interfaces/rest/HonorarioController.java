package br.com.bearerp.escritorioservice.interfaces.rest;

import br.com.bearerp.escritorioservice.application.usecase.HonorarioUseCase;
import br.com.bearerp.escritorioservice.domain.model.Honorario;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/v1/escritorio/honorarios") @RequiredArgsConstructor
public class HonorarioController {
    private final HonorarioUseCase useCase;

    @GetMapping
    public Page<Honorario> listar(Pageable pageable) {
        return useCase.listar(pageable);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Honorario criar(@RequestBody Honorario honorario) {
        return useCase.criar(honorario);
    }

    @PostMapping("/{id}/pagar")
    public Honorario registrarPagamento(@PathVariable String id) {
        return useCase.registrarPagamento(id);
    }

    @GetMapping("/vencidos")
    public List<Honorario> listarVencidos() {
        return useCase.listarVencidos();
    }

    @GetMapping("/cliente/{clienteEmpresaId}")
    public List<Honorario> listarPorCliente(@PathVariable String clienteEmpresaId) {
        return useCase.listarPorCliente(clienteEmpresaId);
    }
}
