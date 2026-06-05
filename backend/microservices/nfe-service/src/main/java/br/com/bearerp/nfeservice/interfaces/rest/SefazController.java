package br.com.bearerp.nfeservice.interfaces.rest;

import br.com.bearerp.nfeservice.infrastructure.sefaz.SefazService;
import br.com.bearerp.nfeservice.infrastructure.sefaz.StatusServicoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/fiscal/sefaz")
@RequiredArgsConstructor
@Tag(name = "SEFAZ", description = "Status e operações da SEFAZ")
public class SefazController {

    private final SefazService sefazService;

    @GetMapping("/status")
    @Operation(summary = "Consultar status do serviço SEFAZ")
    public ResponseEntity<StatusServicoResponse> statusServico() {
        return ResponseEntity.ok(sefazService.consultarStatusServico());
    }

    @GetMapping("/consultar/{chaveAcesso}")
    @Operation(summary = "Consultar NF-e na SEFAZ por chave de acesso")
    public ResponseEntity<?> consultarNfe(@PathVariable String chaveAcesso) {
        return ResponseEntity.ok(sefazService.consultarNfe(chaveAcesso, null));
    }
}
