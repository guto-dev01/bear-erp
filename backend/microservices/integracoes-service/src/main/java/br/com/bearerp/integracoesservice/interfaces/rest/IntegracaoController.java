package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.integracoesservice.application.usecase.IntegracaoUseCase;
import br.com.bearerp.integracoesservice.domain.model.Integracao;
import br.com.bearerp.integracoesservice.domain.model.LogIntegracao;
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
import java.util.Map;

@RestController
@RequestMapping("/api/v1/integracoes")
@RequiredArgsConstructor
public class IntegracaoController {
    private final IntegracaoUseCase useCase;

    @GetMapping
    public ResponseEntity<List<Integracao>> listar() {
        return ResponseEntity.ok(useCase.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Integracao> buscar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Integracao> criar(@Valid @RequestBody CriarIntegracaoRequest request) {
        Integracao integracao = useCase.criar(request.getNome(), request.getDescricao(), request.getTipo(),
                request.getConfiguracao(), request.isSincronizacaoAutomatica(), request.getCronExpression());
        return ResponseEntity.status(HttpStatus.CREATED).body(integracao);
    }

    @PostMapping("/{id}/ativar")
    public ResponseEntity<Integracao> ativar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.ativar(id));
    }

    @PostMapping("/{id}/desativar")
    public ResponseEntity<Integracao> desativar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.desativar(id));
    }

    @PostMapping("/{id}/sincronizar")
    public ResponseEntity<LogIntegracao> sincronizar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.sincronizar(id));
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<Page<LogIntegracao>> listarLogs(@PathVariable String id, Pageable pageable) {
        return ResponseEntity.ok(useCase.listarLogs(id, pageable));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable String id) {
        useCase.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class CriarIntegracaoRequest {
        @NotBlank private String nome;
        private String descricao;
        @NotNull private Integracao.TipoIntegracao tipo;
        private Map<String, String> configuracao;
        private boolean sincronizacaoAutomatica;
        private String cronExpression;
    }
}
