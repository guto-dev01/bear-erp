package br.com.bearerp.spedservice.interfaces.rest;

import br.com.bearerp.spedservice.application.dto.CreateObrigacaoRequest;
import br.com.bearerp.spedservice.application.dto.ObrigacaoAcessoriaResponse;
import br.com.bearerp.spedservice.application.usecase.ObrigacaoAcessoriaUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/obrigacoes")
@RequiredArgsConstructor
public class ObrigacaoAcessoriaController {
    private final ObrigacaoAcessoriaUseCase obrigacaoUseCase;

    @PostMapping
    public ResponseEntity<ObrigacaoAcessoriaResponse> criar(@Valid @RequestBody CreateObrigacaoRequest request) {
        return ResponseEntity.ok(obrigacaoUseCase.criarObrigacao(request));
    }

    @PostMapping("/{id}/transmitir")
    public ResponseEntity<ObrigacaoAcessoriaResponse> transmitir(@PathVariable String id, @RequestParam(required = false) String protocolo) {
        return ResponseEntity.ok(obrigacaoUseCase.marcarTransmitida(id, protocolo));
    }

    @GetMapping("/competencia/{competencia}")
    public ResponseEntity<List<ObrigacaoAcessoriaResponse>> listarPorCompetencia(@PathVariable String competencia) {
        return ResponseEntity.ok(obrigacaoUseCase.listarPorCompetencia(competencia));
    }

    @GetMapping("/pendentes")
    public ResponseEntity<List<ObrigacaoAcessoriaResponse>> listarPendentes() {
        return ResponseEntity.ok(obrigacaoUseCase.listarPendentes());
    }

    @GetMapping("/periodo")
    public ResponseEntity<List<ObrigacaoAcessoriaResponse>> listarPorPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return ResponseEntity.ok(obrigacaoUseCase.listarPorPeriodo(inicio, fim));
    }
}
