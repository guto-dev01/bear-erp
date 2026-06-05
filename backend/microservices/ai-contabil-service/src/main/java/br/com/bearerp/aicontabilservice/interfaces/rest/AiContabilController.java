package br.com.bearerp.aicontabilservice.interfaces.rest;

import br.com.bearerp.aicontabilservice.application.usecase.AiContabilUseCase;
import br.com.bearerp.aicontabilservice.domain.model.ClassificacaoAutomatica;
import br.com.bearerp.aicontabilservice.domain.model.ConsultaIA;
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

import java.util.List;

@RestController
@RequestMapping("/api/v1/ai-contabil")
@RequiredArgsConstructor
public class AiContabilController {
    private final AiContabilUseCase useCase;

    @PostMapping("/consultar")
    public ResponseEntity<ConsultaIA> consultar(@Valid @RequestBody ConsultarRequest request) {
        ConsultaIA consulta = useCase.consultar(request.getTipo(), request.getPergunta(), request.getContexto());
        return ResponseEntity.status(HttpStatus.CREATED).body(consulta);
    }

    @GetMapping("/consultas")
    public ResponseEntity<Page<ConsultaIA>> listarConsultas(Pageable pageable) {
        return ResponseEntity.ok(useCase.listarConsultas(pageable));
    }

    @PostMapping("/classificar")
    public ResponseEntity<ClassificacaoAutomatica> classificar(@Valid @RequestBody ClassificarRequest request) {
        ClassificacaoAutomatica c = useCase.classificar(request.getDescricao());
        return ResponseEntity.status(HttpStatus.CREATED).body(c);
    }

    @GetMapping("/classificacoes/pendentes")
    public ResponseEntity<List<ClassificacaoAutomatica>> listarPendentes() {
        return ResponseEntity.ok(useCase.listarClassificacoesPendentes());
    }

    @PostMapping("/classificacoes/{id}/aceitar")
    public ResponseEntity<ClassificacaoAutomatica> aceitar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.aceitarClassificacao(id));
    }

    @PostMapping("/classificacoes/{id}/rejeitar")
    public ResponseEntity<ClassificacaoAutomatica> rejeitar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.rejeitarClassificacao(id));
    }

    @Data
    public static class ConsultarRequest {
        @NotNull private ConsultaIA.TipoConsulta tipo;
        @NotBlank private String pergunta;
        private String contexto;
    }

    @Data
    public static class ClassificarRequest {
        @NotBlank private String descricao;
    }
}
