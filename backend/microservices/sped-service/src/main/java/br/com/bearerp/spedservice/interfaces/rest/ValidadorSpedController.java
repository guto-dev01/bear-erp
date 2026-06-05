package br.com.bearerp.spedservice.interfaces.rest;

import br.com.bearerp.spedservice.infrastructure.validador.ValidadorSpedService;
import br.com.bearerp.spedservice.infrastructure.validador.ValidadorSpedService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/sped/validador")
@RequiredArgsConstructor
public class ValidadorSpedController {

    private final ValidadorSpedService validadorSpedService;

    @PostMapping("/fiscal")
    public ResponseEntity<ResultadoValidacao> validarFiscal(
            @RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(validadorSpedService.validarSpedFiscal(
                dados.get("conteudo"), dados.get("competencia")));
    }

    @PostMapping("/contabil")
    public ResponseEntity<ResultadoValidacao> validarContabil(
            @RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(validadorSpedService.validarSpedContabil(
                dados.get("conteudo"), dados.get("competencia")));
    }

    @PostMapping("/corrigir")
    public ResponseEntity<Map<String, String>> corrigir(@RequestBody Map<String, Object> dados) {
        String resultado = validadorSpedService.aplicarCorrecao(
                (String) dados.get("conteudo"),
                (int) dados.get("linha"),
                (String) dados.get("valorAtual"),
                (String) dados.get("valorNovo"));
        return ResponseEntity.ok(Map.of("conteudo", resultado));
    }

    @PostMapping("/comparar")
    public ResponseEntity<Map<String, Object>> comparar(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(validadorSpedService.compararSped(
                dados.get("spedAnterior"), dados.get("spedAtual")));
    }
}
