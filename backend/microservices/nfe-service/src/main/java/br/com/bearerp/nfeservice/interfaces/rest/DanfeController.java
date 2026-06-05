package br.com.bearerp.nfeservice.interfaces.rest;

import br.com.bearerp.nfeservice.application.usecase.NfeUseCase;
import br.com.bearerp.nfeservice.infrastructure.report.DanfePdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/fiscal/nfe")
@RequiredArgsConstructor
@Tag(name = "DANFE", description = "Geração de DANFE em PDF")
public class DanfeController {

    private final NfeUseCase nfeUseCase;
    private final DanfePdfService danfePdfService;

    @GetMapping("/{id}/danfe")
    @Operation(summary = "Gerar DANFE em PDF")
    public ResponseEntity<byte[]> gerarDanfe(@PathVariable String id) {
        Map<String, Object> nfeData = nfeUseCase.getNfeParaDanfe(id);
        byte[] pdf = danfePdfService.generateDanfePdf(nfeData);
        String numero = nfeData.getOrDefault("numero", "").toString();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, String.format("attachment; filename=\"danfe_%s.pdf\"", numero))
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
