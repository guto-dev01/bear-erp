package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.integracoesservice.domain.model.ConsultaEcac;
import br.com.bearerp.integracoesservice.domain.model.ConsultaEcac.TipoConsultaEcac;
import br.com.bearerp.integracoesservice.infrastructure.ecac.EcacService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/integracoes/ecac")
@RequiredArgsConstructor
@Tag(name = "e-CAC", description = "Integração com o Centro Virtual de Atendimento ao Contribuinte da Receita Federal")
public class EcacController {

    private final EcacService ecacService;

    @PostMapping("/consultar")
    @Operation(summary = "Agendar consulta ao e-CAC")
    public ResponseEntity<ConsultaEcac> consultar(@RequestBody Map<String, String> body) {
        String cnpj = body.get("cnpjEmpresa");
        String certificadoId = body.get("certificadoId");
        TipoConsultaEcac tipo = body.containsKey("tipo")
                ? TipoConsultaEcac.valueOf(body.get("tipo"))
                : TipoConsultaEcac.COMPLETA;
        String periodo = body.getOrDefault("periodoReferencia", "");

        ConsultaEcac consulta = ecacService.agendarConsulta(cnpj, certificadoId, tipo, periodo);
        return ResponseEntity.accepted().body(consulta);
    }

    @GetMapping("/empresa/{cnpj}")
    @Operation(summary = "Buscar última consulta de uma empresa")
    public ResponseEntity<ConsultaEcac> ultimaConsulta(@PathVariable String cnpj) {
        ConsultaEcac consulta = ecacService.buscarUltimaConsulta(cnpj);
        if (consulta == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(consulta);
    }

    @GetMapping("/empresa/{cnpj}/historico")
    @Operation(summary = "Listar histórico de consultas de uma empresa")
    public ResponseEntity<List<ConsultaEcac>> historico(@PathVariable String cnpj) {
        return ResponseEntity.ok(ecacService.listarConsultas(cnpj));
    }

    @GetMapping("/pendencias")
    @Operation(summary = "Listar empresas com pendências fiscais")
    public ResponseEntity<List<ConsultaEcac>> empresasComPendencias() {
        return ResponseEntity.ok(ecacService.listarEmpresasComPendencias());
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard resumo e-CAC")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(ecacService.dashboard());
    }

    @PostMapping("/reconsultar/{id}")
    @Operation(summary = "Reconsultar empresa a partir de consulta anterior")
    public ResponseEntity<ConsultaEcac> reconsultar(@PathVariable String id) {
        // Buscar consulta anterior para pegar dados do certificado
        ConsultaEcac anterior = ecacService.buscarUltimaConsulta(id);
        if (anterior == null) return ResponseEntity.notFound().build();

        ConsultaEcac nova = ecacService.agendarConsulta(
                anterior.getCnpjEmpresa(),
                anterior.getCertificadoId(),
                TipoConsultaEcac.COMPLETA,
                anterior.getPeriodoReferencia()
        );
        return ResponseEntity.accepted().body(nova);
    }
}
