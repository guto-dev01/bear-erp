package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.domain.model.Dmed;
import br.com.bearerp.fiscalservice.infrastructure.dmed.DmedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fiscal/dmed")
@RequiredArgsConstructor
@Tag(name = "DMED", description = "Declaração de Serviços Médicos e de Saúde")
public class DmedController {

    private final DmedService dmedService;

    @PostMapping("/{ano}")
    @Operation(summary = "Criar declaração DMED")
    public ResponseEntity<Dmed> criar(@PathVariable int ano) {
        return ResponseEntity.ok(dmedService.criarDeclaracao(ano));
    }

    @PostMapping("/{id}/beneficiario")
    @Operation(summary = "Adicionar beneficiário à DMED")
    public ResponseEntity<Dmed> adicionarBeneficiario(@PathVariable String id,
                                                       @RequestBody Dmed.BeneficiarioSaude beneficiario) {
        return ResponseEntity.ok(dmedService.adicionarBeneficiario(id, beneficiario));
    }

    @PostMapping("/{id}/validar")
    @Operation(summary = "Validar DMED")
    public ResponseEntity<Dmed> validar(@PathVariable String id) {
        return ResponseEntity.ok(dmedService.validar(id));
    }

    @GetMapping("/{id}/arquivo")
    @Operation(summary = "Gerar arquivo da declaração")
    public ResponseEntity<String> gerarArquivo(@PathVariable String id) {
        return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(dmedService.gerarArquivo(id));
    }

    @PostMapping("/{id}/entregar")
    @Operation(summary = "Marcar como entregue")
    public ResponseEntity<Dmed> marcarEntregue(@PathVariable String id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(dmedService.marcarEntregue(id, body.get("protocolo"), body.get("recibo")));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar DMED")
    public ResponseEntity<Dmed> consultar(@PathVariable String id) {
        return ResponseEntity.ok(dmedService.buscar(id));
    }

    @GetMapping
    @Operation(summary = "Listar declarações DMED")
    public ResponseEntity<List<Dmed>> listar() {
        return ResponseEntity.ok(dmedService.listar());
    }
}
