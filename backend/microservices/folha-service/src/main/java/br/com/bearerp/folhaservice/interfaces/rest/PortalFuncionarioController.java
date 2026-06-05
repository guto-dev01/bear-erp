package br.com.bearerp.folhaservice.interfaces.rest;

import br.com.bearerp.folhaservice.infrastructure.portal.PortalFuncionarioService;
import br.com.bearerp.folhaservice.infrastructure.portal.PortalFuncionarioService.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/folha/portal-funcionario")
@RequiredArgsConstructor
@Tag(name = "Portal do Funcionário", description = "Self-service: holerites, férias, solicitações, informe de rendimentos")
public class PortalFuncionarioController {

    private final PortalFuncionarioService service;

    @GetMapping("/{funcionarioId}/dashboard")
    @Operation(summary = "Dashboard do funcionário")
    public ResponseEntity<Map<String, Object>> dashboard(@PathVariable String funcionarioId) {
        return ResponseEntity.ok(service.dashboardFuncionario(funcionarioId));
    }

    @GetMapping("/{funcionarioId}/holerites")
    @Operation(summary = "Listar holerites do funcionário")
    public ResponseEntity<List<Map<String, Object>>> holerites(@PathVariable String funcionarioId) {
        return ResponseEntity.ok(service.listarHolerites(funcionarioId));
    }

    @GetMapping("/{funcionarioId}/ferias")
    @Operation(summary = "Consultar saldo de férias")
    public ResponseEntity<Map<String, Object>> ferias(@PathVariable String funcionarioId) {
        return ResponseEntity.ok(service.consultarSaldoFerias(funcionarioId));
    }

    @GetMapping("/{funcionarioId}/ponto/{competencia}")
    @Operation(summary = "Consultar espelho de ponto")
    public ResponseEntity<Map<String, Object>> ponto(@PathVariable String funcionarioId,
                                                       @PathVariable String competencia) {
        return ResponseEntity.ok(service.consultarEspelhoPonto(funcionarioId, competencia));
    }

    @GetMapping("/{funcionarioId}/informe-rendimentos/{ano}")
    @Operation(summary = "Gerar informe de rendimentos")
    public ResponseEntity<Map<String, Object>> informeRendimentos(@PathVariable String funcionarioId,
                                                                     @PathVariable int ano) {
        return ResponseEntity.ok(service.gerarInformeRendimentos(funcionarioId, ano));
    }

    @PostMapping("/{funcionarioId}/solicitacoes")
    @Operation(summary = "Criar solicitação (férias, adiantamento, declaração)")
    public ResponseEntity<SolicitacaoFuncionario> solicitar(@PathVariable String funcionarioId,
                                                              @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.criarSolicitacao(
                funcionarioId,
                (String) body.get("nome"),
                TipoSolicitacao.valueOf((String) body.get("tipo")),
                (String) body.get("descricao"),
                body));
    }

    @GetMapping("/{funcionarioId}/solicitacoes")
    @Operation(summary = "Listar solicitações do funcionário")
    public ResponseEntity<List<SolicitacaoFuncionario>> solicitacoes(@PathVariable String funcionarioId) {
        return ResponseEntity.ok(service.listarSolicitacoes(funcionarioId));
    }

    @PostMapping("/solicitacoes/{id}/responder")
    @Operation(summary = "RH responde solicitação")
    public ResponseEntity<SolicitacaoFuncionario> responder(@PathVariable String id,
                                                              @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.responderSolicitacao(id,
                StatusSolicitacao.valueOf(body.get("status")),
                body.get("resposta")));
    }

    @GetMapping("/solicitacoes/pendentes")
    @Operation(summary = "Listar solicitações pendentes (visão RH)")
    public ResponseEntity<List<SolicitacaoFuncionario>> pendentes() {
        return ResponseEntity.ok(service.listarSolicitacoesPendentes());
    }
}
