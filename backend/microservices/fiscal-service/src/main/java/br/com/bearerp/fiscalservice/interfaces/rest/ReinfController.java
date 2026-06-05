package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.domain.model.EventoReinf;
import br.com.bearerp.fiscalservice.infrastructure.reinf.ReinfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fiscal/reinf")
@RequiredArgsConstructor
@Tag(name = "REINF", description = "EFD-REINF - Escrituração Fiscal Digital de Retenções e Outras Informações Fiscais")
public class ReinfController {

    private final ReinfService reinfService;

    @PostMapping
    @Operation(summary = "Criar evento REINF")
    public ResponseEntity<EventoReinf> criar(@RequestBody EventoReinf evento) {
        return ResponseEntity.ok(reinfService.criarEvento(evento));
    }

    @PostMapping("/{id}/validar")
    @Operation(summary = "Validar evento REINF e gerar XML")
    public ResponseEntity<EventoReinf> validar(@PathVariable String id) {
        return ResponseEntity.ok(reinfService.validarEvento(id));
    }

    @PostMapping("/{id}/enviar")
    @Operation(summary = "Enviar evento REINF para Receita Federal")
    public ResponseEntity<EventoReinf> enviar(@PathVariable String id) {
        return ResponseEntity.ok(reinfService.enviarEvento(id));
    }

    @PostMapping("/{id}/reprocessar")
    @Operation(summary = "Reprocessar evento rejeitado")
    public ResponseEntity<EventoReinf> reprocessar(@PathVariable String id) {
        return ResponseEntity.ok(reinfService.reprocessar(id));
    }

    @PostMapping("/fechar/{competencia}")
    @Operation(summary = "Fechar competência (R-2099)")
    public ResponseEntity<EventoReinf> fecharCompetencia(@PathVariable String competencia) {
        return ResponseEntity.ok(reinfService.fecharCompetencia(competencia));
    }

    @GetMapping("/{id}/xml")
    @Operation(summary = "Visualizar XML do evento")
    public ResponseEntity<String> visualizarXml(@PathVariable String id) {
        EventoReinf evento = reinfService.listar(Pageable.unpaged()).getContent().stream()
                .filter(e -> e.getId().equals(id)).findFirst()
                .orElseThrow(() -> new RuntimeException("Evento não encontrado"));
        String xml = reinfService.gerarXml(evento);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_XML).body(xml);
    }

    @GetMapping
    @Operation(summary = "Listar eventos REINF")
    public ResponseEntity<Page<EventoReinf>> listar(Pageable pageable) {
        return ResponseEntity.ok(reinfService.listar(pageable));
    }

    @GetMapping("/competencia/{competencia}")
    @Operation(summary = "Listar eventos por competência")
    public ResponseEntity<List<EventoReinf>> listarPorCompetencia(@PathVariable String competencia) {
        return ResponseEntity.ok(reinfService.listarPorCompetencia(competencia));
    }
}
