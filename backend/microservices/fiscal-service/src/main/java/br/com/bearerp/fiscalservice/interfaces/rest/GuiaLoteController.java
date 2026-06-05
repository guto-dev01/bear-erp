package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal;
import br.com.bearerp.fiscalservice.infrastructure.guias.GuiaLoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fiscal/guias")
@RequiredArgsConstructor
@Tag(name = "Guias Fiscais", description = "Geração em lote de DARF, GPS, DAS")
public class GuiaLoteController {

    private final GuiaLoteService guiaService;

    @PostMapping("/lote")
    @Operation(summary = "Gerar guias em lote para múltiplas empresas")
    public ResponseEntity<List<GuiaFiscal>> gerarLote(@RequestBody Map<String, Object> body) {
        String tipo = (String) body.get("tipo");
        String competencia = (String) body.get("competencia");
        @SuppressWarnings("unchecked")
        List<String> empresaIds = (List<String>) body.get("empresaIds");

        return ResponseEntity.ok(guiaService.gerarGuiasEmLote(
                GuiaFiscal.TipoGuia.valueOf(tipo), competencia, empresaIds));
    }

    @PostMapping("/lote/pdf")
    @Operation(summary = "Gerar PDF com todas as guias do lote")
    public ResponseEntity<byte[]> gerarPdfLote(@RequestBody List<String> guiaIds) {
        byte[] pdf = guiaService.gerarPdfLote(guiaIds);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=guias-lote.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/competencia/{competencia}")
    @Operation(summary = "Listar guias por competência")
    public ResponseEntity<List<GuiaFiscal>> listarPorCompetencia(@PathVariable String competencia) {
        return ResponseEntity.ok(guiaService.listarPorCompetencia(competencia));
    }
}
