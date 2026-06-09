package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.integracoesservice.infrastructure.cpf.ConsultaCpfService;
import br.com.bearerp.integracoesservice.infrastructure.cpf.DadosCpf;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Consulta de dados de pessoa física por CPF (Hub do Desenvolvedor).
 *
 * GET /api/v1/integracoes/cpf/{cpf}?dataNascimento=aaaa-mm-dd
 */
@RestController
@RequestMapping("/api/v1/integracoes/cpf")
@RequiredArgsConstructor
public class ConsultaCpfController {

    private final ConsultaCpfService consultaCpfService;

    @GetMapping("/{cpf}")
    public ResponseEntity<DadosCpf> consultarCpf(
            @PathVariable String cpf,
            @RequestParam(required = false) String dataNascimento) {
        return ResponseEntity.ok(consultaCpfService.consultar(cpf, dataNascimento));
    }
}
