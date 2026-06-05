package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.integracoesservice.domain.model.OcrDocumento;
import br.com.bearerp.integracoesservice.infrastructure.ocr.OcrService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/integracoes/ocr")
@RequiredArgsConstructor
@Tag(name = "OCR", description = "Digitalização automática de notas fiscais e documentos")
public class OcrController {

    private final OcrService ocrService;

    @PostMapping("/upload")
    @Operation(summary = "Upload de documento para OCR (imagem/PDF)")
    public ResponseEntity<OcrDocumento> upload(@RequestParam("arquivo") MultipartFile arquivo) {
        try {
            OcrDocumento doc = ocrService.uploadParaProcessamento(arquivo);
            ocrService.processarOcr(doc.getId(), arquivo.getBytes());
            return ResponseEntity.accepted().body(doc);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/validar")
    @Operation(summary = "Validar/corrigir dados extraídos pelo OCR")
    public ResponseEntity<OcrDocumento> validar(@PathVariable String id,
                                                 @RequestBody Map<String, Object> correcoes) {
        return ResponseEntity.ok(ocrService.validarExtracao(id, correcoes));
    }

    @PostMapping("/{id}/lancar")
    @Operation(summary = "Gerar lançamento contábil a partir do OCR")
    public ResponseEntity<OcrDocumento> gerarLancamento(@PathVariable String id) {
        return ResponseEntity.ok(ocrService.gerarLancamento(id));
    }

    @GetMapping
    @Operation(summary = "Listar documentos OCR")
    public ResponseEntity<List<OcrDocumento>> listar() {
        return ResponseEntity.ok(ocrService.listar());
    }
}
