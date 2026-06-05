package br.com.bearerp.nfeservice.interfaces.rest;

import br.com.bearerp.nfeservice.infrastructure.importacao.ImportacaoXmlMassaService;
import br.com.bearerp.nfeservice.infrastructure.importacao.ImportacaoXmlMassaService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/nfe/importacao-xml")
@RequiredArgsConstructor
public class ImportacaoXmlMassaController {

    private final ImportacaoXmlMassaService importacaoService;

    @PostMapping("/upload")
    public ResponseEntity<ImportacaoXmlLote> upload(@RequestParam("arquivo") MultipartFile arquivo) throws IOException {
        return ResponseEntity.ok(importacaoService.uploadZip(arquivo));
    }

    @PostMapping("/{loteId}/confirmar")
    public ResponseEntity<Void> confirmar(@PathVariable String loteId) {
        importacaoService.confirmarImportacao(loteId);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{loteId}/progresso")
    public ResponseEntity<ImportacaoXmlLote> progresso(@PathVariable String loteId) {
        return ResponseEntity.ok(importacaoService.progresso(loteId));
    }
}
