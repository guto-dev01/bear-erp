package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.integracoesservice.infrastructure.cnpj.ConsultaCnpjService;
import br.com.bearerp.integracoesservice.infrastructure.cnpj.ConsultaCnpjService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/integracoes/cnpj")
@RequiredArgsConstructor
public class ConsultaCnpjController {

    private final ConsultaCnpjService consultaCnpjService;

    @GetMapping("/{cnpj}")
    public ResponseEntity<DadosCnpj> consultarCnpj(@PathVariable String cnpj) {
        return ResponseEntity.ok(consultaCnpjService.consultarCnpj(cnpj));
    }

    @GetMapping("/cpf/{cpf}")
    public ResponseEntity<Map<String, Object>> consultarCpf(@PathVariable String cpf) {
        return ResponseEntity.ok(consultaCnpjService.consultarCpf(cpf));
    }

    @GetMapping("/sintegra/{uf}/{inscricaoEstadual}")
    public ResponseEntity<Map<String, Object>> consultarSintegra(
            @PathVariable String uf, @PathVariable String inscricaoEstadual) {
        return ResponseEntity.ok(consultaCnpjService.consultarSintegra(uf, inscricaoEstadual));
    }

    @GetMapping("/{cnpj}/score")
    public ResponseEntity<ScoreFornecedor> scoreFornecedor(@PathVariable String cnpj) {
        return ResponseEntity.ok(consultaCnpjService.calcularScoreFornecedor(cnpj));
    }
}
