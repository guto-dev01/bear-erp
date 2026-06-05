package br.com.bearerp.fiscalservice.interfaces.rest;

import br.com.bearerp.fiscalservice.application.dto.ApuracaoIcmsResponse;
import br.com.bearerp.fiscalservice.application.usecase.ApuracaoIcmsUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fiscal/apuracao-icms")
@RequiredArgsConstructor
public class ApuracaoIcmsController {

    private final ApuracaoIcmsUseCase apuracaoUseCase;

    @PostMapping("/calcular")
    public ResponseEntity<ApuracaoIcmsResponse> calcular(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(apuracaoUseCase.calcularApuracao(ano, mes));
    }

    @GetMapping
    public ResponseEntity<ApuracaoIcmsResponse> getApuracao(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(apuracaoUseCase.getApuracao(ano, mes));
    }

    @GetMapping("/ano/{ano}")
    public ResponseEntity<List<ApuracaoIcmsResponse>> listarPorAno(@PathVariable int ano) {
        return ResponseEntity.ok(apuracaoUseCase.listarPorAno(ano));
    }

    @PostMapping("/fechar")
    public ResponseEntity<ApuracaoIcmsResponse> fechar(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(apuracaoUseCase.fecharApuracao(ano, mes));
    }
}
