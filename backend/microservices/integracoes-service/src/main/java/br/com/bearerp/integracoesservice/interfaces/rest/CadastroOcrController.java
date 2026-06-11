package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro.CadastroOcrService;
import br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro.TipoDocumento;
import br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro.TipoPessoa;
import br.com.bearerp.integracoesservice.interfaces.rest.dto.CadastroOcrResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * OCR de documentos no fluxo de "Novo cadastro" (Clientes / Empresas).
 *
 * <p>Recebe o documento, extrai os dados e devolve um JSON pronto para preencher o formulário.
 * Nada é persistido — o usuário revisa e confirma antes de salvar.</p>
 *
 * <pre>
 * POST /api/v1/integracoes/cadastros/ocr   (multipart/form-data)
 *   tipoPessoa    = PF | PJ
 *   tipoDocumento = CNH | RG | COMPROVANTE_ENDERECO | CNPJ | CONTRATO_SOCIAL
 *   arquivo       = MultipartFile (PDF, JPG, PNG — até 10 MB)
 * </pre>
 *
 * Roteado pelo API Gateway via {@code /api/v1/integracoes/**}.
 */
@RestController
@RequestMapping("/api/v1/integracoes/cadastros")
@RequiredArgsConstructor
@Tag(name = "Cadastro OCR", description = "Leitura automática de documentos para preencher o cadastro")
public class CadastroOcrController {

    private final CadastroOcrService cadastroOcrService;

    @PostMapping(value = "/ocr", consumes = "multipart/form-data")
    @Operation(summary = "Extrai os dados de um documento e preenche o cadastro automaticamente")
    public ResponseEntity<CadastroOcrResponse> ocr(
            @RequestParam("tipoPessoa") @NotNull TipoPessoa tipoPessoa,
            @RequestParam("tipoDocumento") @NotNull TipoDocumento tipoDocumento,
            @RequestParam("arquivo") MultipartFile arquivo) {
        CadastroOcrResponse resposta = cadastroOcrService.processar(tipoPessoa, tipoDocumento, arquivo);
        return ResponseEntity.ok(resposta);
    }

    /** Arquivo inválido / parâmetro incompatível → 400 com mensagem amigável. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleInvalido(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("erro", e.getMessage(), "preenchimentoManual", true));
    }
}
