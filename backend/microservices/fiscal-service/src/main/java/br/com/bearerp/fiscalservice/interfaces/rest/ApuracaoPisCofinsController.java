package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.application.dto.ApuracaoPisCofinsResponse;
import br.com.bearerp.fiscalservice.application.usecase.ApuracaoPisCofinsUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fiscal/apuracao-pis-cofins")
@RequiredArgsConstructor
public class ApuracaoPisCofinsController {

    private final ApuracaoPisCofinsUseCase apuracaoUseCase;

    @PostMapping("/calcular")
    public ResponseEntity<ApuracaoPisCofinsResponse> calcular(@RequestParam int ano, @RequestParam int mes, @RequestParam(defaultValue = "NAO_CUMULATIVO") String regime) {
        return ResponseEntity.ok(apuracaoUseCase.calcularApuracao(ano, mes, regime));
    }

    @GetMapping
    public ResponseEntity<ApuracaoPisCofinsResponse> getApuracao(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(apuracaoUseCase.getApuracao(ano, mes));
    }

    @GetMapping("/ano/{ano}")
    public ResponseEntity<List<ApuracaoPisCofinsResponse>> listarPorAno(@PathVariable int ano) {
        return ResponseEntity.ok(apuracaoUseCase.listarPorAno(ano));
    }
}
