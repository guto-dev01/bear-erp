package br.com.bearerp.patrimonioservice.interfaces.rest;

import br.com.bearerp.patrimonioservice.infrastructure.depreciacao.DepreciacaoAvancadaService;
import br.com.bearerp.patrimonioservice.infrastructure.depreciacao.DepreciacaoAvancadaService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/patrimonio/depreciacao")
@RequiredArgsConstructor
public class DepreciacaoAvancadaController {

    private final DepreciacaoAvancadaService depreciacaoService;

    @PostMapping("/calcular")
    public ResponseEntity<ResultadoDepreciacao> calcular(@RequestBody ParametrosDepreciacao parametros) {
        return ResponseEntity.ok(depreciacaoService.calcularDepreciacao(parametros));
    }

    @PostMapping("/impairment")
    public ResponseEntity<ResultadoImpairment> impairment(@RequestBody Map<String, Object> dados) {
        return ResponseEntity.ok(depreciacaoService.testeImpairment(
                (String) dados.get("bemId"),
                new BigDecimal(dados.get("valorContabil").toString()),
                new BigDecimal(dados.get("valorEmUso").toString()),
                new BigDecimal(dados.get("valorJusto").toString())));
    }

    @PostMapping("/comparar-metodos")
    public ResponseEntity<Map<String, Object>> compararMetodos(@RequestBody ParametrosDepreciacao parametros) {
        return ResponseEntity.ok(depreciacaoService.compararMetodos(parametros));
    }

    @GetMapping("/taxas-rfb")
    public ResponseEntity<List<Map<String, Object>>> taxasRfb() {
        return ResponseEntity.ok(depreciacaoService.tabelaTaxasRfb());
    }
}
