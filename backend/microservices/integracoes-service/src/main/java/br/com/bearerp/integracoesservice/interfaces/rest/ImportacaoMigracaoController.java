package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.integracoesservice.application.usecase.ImportacaoMigracaoUseCase;
import br.com.bearerp.integracoesservice.domain.model.ImportacaoMigracao;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/integracoes/migracao")
@RequiredArgsConstructor
@Tag(name = "Migração", description = "Importação de dados de outros sistemas (Domínio, Fortes, Alterdata)")
public class ImportacaoMigracaoController {

    private final ImportacaoMigracaoUseCase useCase;

    @PostMapping("/importar")
    @Operation(summary = "Iniciar importação de dados")
    public ResponseEntity<ImportacaoMigracao> iniciarImportacao(
            @RequestParam String sistemaOrigem,
            @RequestParam String tipo,
            @RequestParam("arquivo") MultipartFile arquivo,
            @RequestParam(required = false) Map<String, String> mapeamento) {
        try {
            ImportacaoMigracao importacao = useCase.iniciarImportacao(
                    sistemaOrigem,
                    ImportacaoMigracao.TipoImportacao.valueOf(tipo),
                    arquivo,
                    mapeamento
            );
            useCase.processarImportacao(importacao.getId(), arquivo.getInputStream());
            return ResponseEntity.accepted().body(importacao);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/preview")
    @Operation(summary = "Pré-visualizar arquivo antes de importar")
    public ResponseEntity<Map<String, Object>> preVisualizar(
            @RequestParam String sistemaOrigem,
            @RequestParam String tipo,
            @RequestParam("arquivo") MultipartFile arquivo) {
        try {
            return ResponseEntity.ok(useCase.preVisualizarArquivo(sistemaOrigem, tipo, arquivo.getInputStream()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}/progresso")
    @Operation(summary = "Consultar progresso da importação")
    public ResponseEntity<ImportacaoMigracao> progresso(@PathVariable String id) {
        return ResponseEntity.ok(useCase.consultarProgresso(id));
    }

    @GetMapping
    @Operation(summary = "Listar importações")
    public ResponseEntity<Page<ImportacaoMigracao>> listar(Pageable pageable) {
        return ResponseEntity.ok(useCase.listar(pageable));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancelar importação")
    public ResponseEntity<Void> cancelar(@PathVariable String id) {
        useCase.cancelar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sistemas-suportados")
    @Operation(summary = "Listar sistemas suportados para migração")
    public ResponseEntity<Map<String, Object>> sistemasSuportados() {
        return ResponseEntity.ok(Map.of(
                "sistemas", new String[]{"DOMINIO", "FORTES", "ALTERDATA", "CONTMATIC", "GENERICO"},
                "tipos", ImportacaoMigracao.TipoImportacao.values(),
                "formatos", new String[]{"CSV", "TXT", "XML", "XLSX"}
        ));
    }
}
