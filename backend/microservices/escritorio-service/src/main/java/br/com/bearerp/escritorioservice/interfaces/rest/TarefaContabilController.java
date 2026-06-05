package br.com.bearerp.escritorioservice.interfaces.rest;

import br.com.bearerp.escritorioservice.application.usecase.TarefaContabilUseCase;
import br.com.bearerp.escritorioservice.domain.model.TarefaContabil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/v1/escritorio/tarefas") @RequiredArgsConstructor
public class TarefaContabilController {
    private final TarefaContabilUseCase useCase;

    @GetMapping
    public Page<TarefaContabil> listar(@RequestParam(required = false) TarefaContabil.StatusTarefa status, Pageable pageable) {
        return useCase.listar(status, pageable);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public TarefaContabil criar(@RequestBody TarefaContabil tarefa) {
        return useCase.criar(tarefa);
    }

    @PatchMapping("/{id}/status")
    public TarefaContabil atualizarStatus(@PathVariable String id, @RequestParam TarefaContabil.StatusTarefa status) {
        return useCase.atualizar(id, status);
    }

    @GetMapping("/atrasadas")
    public List<TarefaContabil> listarAtrasadas() {
        return useCase.listarAtrasadas();
    }

    @GetMapping("/responsavel/{responsavelId}")
    public List<TarefaContabil> listarPorResponsavel(@PathVariable String responsavelId) {
        return useCase.listarPorResponsavel(responsavelId);
    }
}
