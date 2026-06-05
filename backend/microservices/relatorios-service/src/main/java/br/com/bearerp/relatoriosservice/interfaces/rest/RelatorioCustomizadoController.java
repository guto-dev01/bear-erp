package br.com.bearerp.relatoriosservice.interfaces.rest;

import br.com.bearerp.relatoriosservice.application.usecase.RelatorioCustomizadoUseCase;
import br.com.bearerp.relatoriosservice.domain.model.RelatorioCustomizado;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/relatorios/customizados")
@RequiredArgsConstructor
@Tag(name = "Relatórios Customizados", description = "Builder visual de relatórios gerenciais")
public class RelatorioCustomizadoController {

    private final RelatorioCustomizadoUseCase useCase;

    @PostMapping
    @Operation(summary = "Criar relatório customizado")
    public ResponseEntity<RelatorioCustomizado> criar(@RequestBody RelatorioCustomizado relatorio) {
        return ResponseEntity.ok(useCase.criar(relatorio));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar relatório")
    public ResponseEntity<RelatorioCustomizado> atualizar(@PathVariable String id, @RequestBody RelatorioCustomizado relatorio) {
        return ResponseEntity.ok(useCase.atualizar(id, relatorio));
    }

    @GetMapping("/{id}/executar")
    @Operation(summary = "Executar consulta do relatório")
    public ResponseEntity<List<Map<String, Object>>> executar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.executarConsulta(id));
    }

    @GetMapping("/{id}/pdf")
    @Operation(summary = "Gerar relatório em PDF")
    public ResponseEntity<byte[]> gerarPdf(@PathVariable String id) {
        byte[] pdf = useCase.gerarPdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/{id}/csv")
    @Operation(summary = "Gerar relatório em CSV")
    public ResponseEntity<String> gerarCsv(@PathVariable String id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(useCase.gerarCsv(id));
    }

    @GetMapping
    @Operation(summary = "Listar relatórios customizados")
    public ResponseEntity<Page<RelatorioCustomizado>> listar(Pageable pageable) {
        return ResponseEntity.ok(useCase.listar(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar relatório")
    public ResponseEntity<RelatorioCustomizado> buscar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.buscar(id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir relatório")
    public ResponseEntity<Void> excluir(@PathVariable String id) {
        useCase.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
