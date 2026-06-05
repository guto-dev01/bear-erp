package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.application.dto.CreateGuiaFiscalRequest;
import br.com.bearerp.fiscalservice.application.dto.GuiaFiscalResponse;
import br.com.bearerp.fiscalservice.application.dto.PagarGuiaRequest;
import br.com.bearerp.fiscalservice.application.usecase.GuiaFiscalUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/fiscal/guias")
@RequiredArgsConstructor
public class GuiaFiscalController {

    private final GuiaFiscalUseCase guiaUseCase;

    @PostMapping
    public ResponseEntity<GuiaFiscalResponse> criar(@Valid @RequestBody CreateGuiaFiscalRequest request) {
        return ResponseEntity.ok(guiaUseCase.criarGuia(request));
    }

    @PostMapping("/{id}/pagar")
    public ResponseEntity<GuiaFiscalResponse> pagar(@PathVariable String id, @Valid @RequestBody PagarGuiaRequest request) {
        return ResponseEntity.ok(guiaUseCase.pagarGuia(id, request));
    }

    @PostMapping("/{id}/cancelar")
    public ResponseEntity<GuiaFiscalResponse> cancelar(@PathVariable String id) {
        return ResponseEntity.ok(guiaUseCase.cancelarGuia(id));
    }

    @GetMapping("/competencia/{competencia}")
    public ResponseEntity<List<GuiaFiscalResponse>> listarPorCompetencia(@PathVariable String competencia) {
        return ResponseEntity.ok(guiaUseCase.listarPorCompetencia(competencia));
    }

    @GetMapping("/tipo/{tipo}")
    public ResponseEntity<List<GuiaFiscalResponse>> listarPorTipo(@PathVariable String tipo) {
        return ResponseEntity.ok(guiaUseCase.listarPorTipo(tipo));
    }

    @GetMapping("/vencidas")
    public ResponseEntity<List<GuiaFiscalResponse>> listarVencidas() {
        return ResponseEntity.ok(guiaUseCase.listarVencidas());
    }

    @GetMapping("/vencimento")
    public ResponseEntity<List<GuiaFiscalResponse>> listarPorVencimento(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return ResponseEntity.ok(guiaUseCase.listarPorVencimento(inicio, fim));
    }
}
