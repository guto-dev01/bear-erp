package br.com.bearerp.aicontabil.interfaces.rest;

import br.com.bearerp.aicontabil.infrastructure.SugestaoInteligente;
import br.com.bearerp.aicontabil.infrastructure.SugestaoInteligente.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai/sugestoes")
@RequiredArgsConstructor
public class SugestaoInteligenteController {

    private final SugestaoInteligente sugestaoInteligente;

    @PostMapping("/contrapartida")
    public ResponseEntity<SugestaoContrapartida> sugerirContrapartida(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(sugestaoInteligente.sugerirContrapartida(
                dados.get("contaDebito"), dados.get("historico"),
                dados.get("cnpjFornecedor"), dados.get("cfop")));
    }

    @PostMapping("/registrar-classificacao")
    public ResponseEntity<Void> registrarClassificacao(@RequestBody Map<String, String> dados) {
        sugestaoInteligente.registrarClassificacao(
                dados.get("cnpjFornecedor"), dados.get("cfop"),
                dados.get("descricao"), dados.get("contaSugerida"),
                dados.get("contaCorrigida"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/ncm/{descricaoProduto}")
    public ResponseEntity<SugestaoNcm> sugerirNcm(@PathVariable String descricaoProduto) {
        return ResponseEntity.ok(sugestaoInteligente.sugerirNcm(descricaoProduto));
    }

    @GetMapping("/plano-contas/{regime}")
    public ResponseEntity<List<ContaReferencial>> planoContasReferencial(@PathVariable String regime) {
        return ResponseEntity.ok(sugestaoInteligente.planoContasReferencial(regime));
    }
}
