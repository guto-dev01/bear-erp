package br.com.bearerp.esocialservice.interfaces.rest;

import br.com.bearerp.esocialservice.application.usecase.EventoEsocialUseCase;
import br.com.bearerp.esocialservice.domain.model.EventoEsocial;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController @RequestMapping("/api/v1/esocial") @RequiredArgsConstructor
public class EventoEsocialController {
    private final EventoEsocialUseCase useCase;

    @GetMapping
    public Page<EventoEsocial> listar(@RequestParam(required = false) EventoEsocial.TipoEvento tipo, Pageable pageable) {
        return useCase.listar(tipo, pageable);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public EventoEsocial criar(@RequestBody CriarEventoRequest request) {
        return useCase.criar(request.getTipoEvento(), request.getFuncionarioId(),
                request.getFuncionarioCpf(), request.getFuncionarioNome(),
                request.getCompetencia(), request.getObservacao());
    }

    @PostMapping("/{id}/validar")
    public EventoEsocial validar(@PathVariable String id) {
        return useCase.validar(id);
    }

    @PostMapping("/{id}/enviar")
    public EventoEsocial enviar(@PathVariable String id) {
        return useCase.enviar(id);
    }

    @GetMapping("/pendentes")
    public List<EventoEsocial> listarPendentes() {
        return useCase.listarPendentes();
    }

    @GetMapping("/competencia/{competencia}")
    public List<EventoEsocial> listarPorCompetencia(@PathVariable String competencia) {
        return useCase.listarPorCompetencia(competencia);
    }

    @GetMapping("/funcionario/{funcionarioId}")
    public List<EventoEsocial> listarPorFuncionario(@PathVariable String funcionarioId) {
        return useCase.listarPorFuncionario(funcionarioId);
    }

    @Data
    public static class CriarEventoRequest {
        private EventoEsocial.TipoEvento tipoEvento;
        private String funcionarioId;
        private String funcionarioCpf;
        private String funcionarioNome;
        private String competencia;
        private String observacao;
    }
}
