package br.com.bearerp.certificadoservice.interfaces.rest;

import br.com.bearerp.certificadoservice.application.usecase.CertificadoDigitalUseCase;
import br.com.bearerp.certificadoservice.domain.model.CertificadoDigital;
import br.com.bearerp.certificadoservice.domain.model.OperacaoCertificado;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/certificados")
@RequiredArgsConstructor
public class CertificadoDigitalController {
    private final CertificadoDigitalUseCase useCase;

    @GetMapping
    public ResponseEntity<List<CertificadoDigital>> listar() {
        return ResponseEntity.ok(useCase.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CertificadoDigital> buscar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.buscarPorId(id));
    }

    @GetMapping("/ativos")
    public ResponseEntity<List<CertificadoDigital>> listarAtivos() {
        return ResponseEntity.ok(useCase.listarAtivos());
    }

    @GetMapping("/proximos-vencimento")
    public ResponseEntity<List<CertificadoDigital>> listarProximosVencimento() {
        return ResponseEntity.ok(useCase.listarProximosVencimento());
    }

    @PostMapping
    public ResponseEntity<CertificadoDigital> cadastrar(@Valid @RequestBody CadastrarCertificadoRequest request) {
        CertificadoDigital cert = useCase.cadastrar(
                request.getNome(), request.getTipo(), request.getCnpjCpf(), request.getRazaoSocial(),
                request.getSerialNumber(), request.getEmissor(), request.getDataEmissao(), request.getDataValidade(),
                request.getArquivoPfx(), request.getSenhaCriptografada(), request.getObservacao());
        return ResponseEntity.status(HttpStatus.CREATED).body(cert);
    }

    @PostMapping("/{id}/revogar")
    public ResponseEntity<CertificadoDigital> revogar(@PathVariable String id) {
        return ResponseEntity.ok(useCase.revogar(id));
    }

    @PostMapping("/{id}/operacoes")
    public ResponseEntity<OperacaoCertificado> registrarOperacao(@PathVariable String id,
                                                                  @Valid @RequestBody RegistrarOperacaoRequest request) {
        OperacaoCertificado op = useCase.registrarOperacao(id, request.getTipoOperacao(),
                request.getStatusOperacao(), request.getDescricao(), request.getDocumentoReferencia(), request.getErroMensagem());
        return ResponseEntity.status(HttpStatus.CREATED).body(op);
    }

    @GetMapping("/{id}/operacoes")
    public ResponseEntity<Page<OperacaoCertificado>> listarOperacoes(@PathVariable String id, Pageable pageable) {
        return ResponseEntity.ok(useCase.listarOperacoes(id, pageable));
    }

    @Data
    public static class CadastrarCertificadoRequest {
        @NotBlank private String nome;
        @NotNull private CertificadoDigital.TipoCertificado tipo;
        @NotBlank private String cnpjCpf;
        private String razaoSocial;
        private String serialNumber;
        private String emissor;
        @NotNull private LocalDate dataEmissao;
        @NotNull private LocalDate dataValidade;
        private byte[] arquivoPfx;
        private String senhaCriptografada;
        private String observacao;
    }

    @Data
    public static class RegistrarOperacaoRequest {
        @NotNull private OperacaoCertificado.TipoOperacao tipoOperacao;
        @NotNull private OperacaoCertificado.StatusOperacao statusOperacao;
        private String descricao;
        private String documentoReferencia;
        private String erroMensagem;
    }
}
