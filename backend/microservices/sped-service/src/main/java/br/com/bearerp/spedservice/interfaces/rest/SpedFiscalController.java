package br.com.bearerp.spedservice.interfaces.rest;

import br.com.bearerp.spedservice.application.dto.SpedFiscalResponse;
import br.com.bearerp.spedservice.application.usecase.SpedFiscalUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/obrigacoes/sped-fiscal")
@RequiredArgsConstructor
public class SpedFiscalController {
    private final SpedFiscalUseCase spedUseCase;

    @PostMapping("/gerar")
    public ResponseEntity<SpedFiscalResponse> gerar(@RequestParam int ano, @RequestParam int mes, @RequestParam(defaultValue = "A") String perfil) {
        return ResponseEntity.ok(spedUseCase.gerarSpedFiscal(ano, mes, perfil));
    }

    @PostMapping("/{id}/transmitir")
    public ResponseEntity<SpedFiscalResponse> transmitir(@PathVariable String id) {
        return ResponseEntity.ok(spedUseCase.transmitirSped(id));
    }

    @GetMapping
    public ResponseEntity<SpedFiscalResponse> getByPeriodo(@RequestParam int ano, @RequestParam int mes) {
        return ResponseEntity.ok(spedUseCase.getByPeriodo(ano, mes));
    }

    @GetMapping("/ano/{ano}")
    public ResponseEntity<List<SpedFiscalResponse>> listarPorAno(@PathVariable int ano) {
        return ResponseEntity.ok(spedUseCase.listarPorAno(ano));
    }
}
