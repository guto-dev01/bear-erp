package br.com.bearerp.relatoriosservice.interfaces.rest;

import br.com.bearerp.relatoriosservice.application.usecase.RelatorioUseCase;
import br.com.bearerp.relatoriosservice.domain.model.Relatorio;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/relatorios")
@RequiredArgsConstructor
public class RelatorioController {
    private final RelatorioUseCase useCase;

    @GetMapping
    public ResponseEntity<Page<Relatorio>> listar(Pageable pageable) {
        return ResponseEntity.ok(useCase.listar(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Relatorio> buscar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Relatorio> solicitar(@Valid @RequestBody SolicitarRelatorioRequest request) {
        Relatorio rel = useCase.solicitar(request.getTitulo(), request.getTipo(), request.getFormato(),
                request.getPeriodoInicio(), request.getPeriodoFim(), request.getParametros());
        return ResponseEntity.status(HttpStatus.CREATED).body(rel);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(@RequestParam(defaultValue = "") String periodo) {
        return ResponseEntity.ok(useCase.gerarDashboard(periodo));
    }

    @Data
    public static class SolicitarRelatorioRequest {
        @NotBlank private String titulo;
        @NotNull private Relatorio.TipoRelatorio tipo;
        @NotNull private Relatorio.FormatoRelatorio formato;
        @NotBlank private String periodoInicio;
        @NotBlank private String periodoFim;
        private Map<String, Object> parametros;
    }
}
