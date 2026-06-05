package br.com.bearerp.escritorioservice.interfaces.rest;

import br.com.bearerp.escritorioservice.infrastructure.site.SiteBuilderService;
import br.com.bearerp.escritorioservice.infrastructure.site.SiteBuilderService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/escritorio/site-builder")
@RequiredArgsConstructor
public class SiteBuilderController {

    private final SiteBuilderService siteBuilderService;

    @PostMapping
    public ResponseEntity<SiteEscritorio> criar(@RequestBody SiteEscritorio site) {
        return ResponseEntity.ok(siteBuilderService.criar(site));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SiteEscritorio> atualizar(@PathVariable String id, @RequestBody SiteEscritorio site) {
        return ResponseEntity.ok(siteBuilderService.atualizar(id, site));
    }

    @GetMapping
    public ResponseEntity<SiteEscritorio> buscar() {
        return ResponseEntity.ok(siteBuilderService.buscar());
    }

    @PostMapping("/{id}/publicar")
    public ResponseEntity<SiteEscritorio> publicar(@PathVariable String id) {
        return ResponseEntity.ok(siteBuilderService.publicar(id));
    }

    @PostMapping("/{id}/despublicar")
    public ResponseEntity<SiteEscritorio> despublicar(@PathVariable String id) {
        return ResponseEntity.ok(siteBuilderService.despublicar(id));
    }

    @GetMapping("/templates")
    public ResponseEntity<List<Map<String, Object>>> templates() {
        return ResponseEntity.ok(siteBuilderService.listarTemplates());
    }

    @PostMapping("/criar-de-template")
    public ResponseEntity<SiteEscritorio> criarDeTemplate(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(siteBuilderService.criarDeTemplate(
                dados.get("templateId"), dados.get("nomeEscritorio")));
    }
}
