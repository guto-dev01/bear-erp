package br.com.bearerp.folhaservice.interfaces.rest;

import br.com.bearerp.folhaservice.infrastructure.report.HoleritePdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/folha/relatorios")
@RequiredArgsConstructor
@Tag(name = "Relatórios Folha", description = "Geração de holerites e relatórios de folha em PDF")
public class RelatorioFolhaController {

    private final HoleritePdfService holeritePdfService;

    @PostMapping("/holerite/pdf")
    @Operation(summary = "Gerar Holerite em PDF")
    public ResponseEntity<byte[]> holeritePdf(@RequestBody Map<String, Object> holerite) {
        byte[] pdf = holeritePdfService.generateHoleritePdf(holerite);
        String nome = holerite.getOrDefault("nomeFuncionario", "funcionario").toString().replaceAll("\\s+", "_");
        String comp = holerite.getOrDefault("competencia", "").toString();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, String.format("attachment; filename=\"holerite_%s_%s.pdf\"", nome, comp))
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
