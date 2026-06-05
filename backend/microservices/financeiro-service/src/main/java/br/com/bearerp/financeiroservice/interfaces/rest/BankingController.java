package br.com.bearerp.financeiroservice.interfaces.rest;

import br.com.bearerp.financeiroservice.infrastructure.banking.boleto.BoletoRequest;
import br.com.bearerp.financeiroservice.infrastructure.banking.boleto.BoletoResponse;
import br.com.bearerp.financeiroservice.infrastructure.banking.boleto.BoletoService;
import br.com.bearerp.financeiroservice.infrastructure.banking.ofx.OfxImportService;
import br.com.bearerp.financeiroservice.infrastructure.banking.pix.PixCobranca;
import br.com.bearerp.financeiroservice.infrastructure.banking.pix.PixService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/financeiro/banking")
@RequiredArgsConstructor
@Tag(name = "Banking", description = "Integração bancária - PIX, Boletos, OFX")
public class BankingController {

    private final PixService pixService;
    private final BoletoService boletoService;
    private final OfxImportService ofxImportService;

    // PIX
    @PostMapping("/pix/cobranca")
    @Operation(summary = "Criar cobrança PIX")
    public ResponseEntity<PixCobranca> criarCobrancaPix(@RequestBody Map<String, String> body) {
        BigDecimal valor = new BigDecimal(body.get("valor"));
        String descricao = body.getOrDefault("descricao", "Cobrança Bear ERP");
        String cpfCnpj = body.get("cpfCnpjPagador");
        String vencimento = body.get("vencimento");

        PixCobranca cobranca;
        if (vencimento != null && !vencimento.isBlank()) {
            cobranca = pixService.criarCobrancaDueDate(valor, descricao, LocalDate.parse(vencimento), cpfCnpj);
        } else {
            cobranca = pixService.criarCobrancaImediata(valor, descricao, cpfCnpj);
        }
        return ResponseEntity.ok(cobranca);
    }

    @GetMapping("/pix/cobranca/{txid}")
    @Operation(summary = "Consultar cobrança PIX")
    public ResponseEntity<PixCobranca> consultarPix(@PathVariable String txid) {
        return ResponseEntity.ok(pixService.consultarCobranca(txid));
    }

    @GetMapping("/pix/recebidos")
    @Operation(summary = "Listar PIX recebidos")
    public ResponseEntity<List<PixCobranca>> listarPixRecebidos(
            @RequestParam String inicio, @RequestParam String fim) {
        return ResponseEntity.ok(pixService.listarPixRecebidos(Instant.parse(inicio), Instant.parse(fim)));
    }

    // Boleto
    @PostMapping("/boleto")
    @Operation(summary = "Gerar boleto bancário")
    public ResponseEntity<BoletoResponse> gerarBoleto(@RequestBody BoletoRequest request) {
        return ResponseEntity.ok(boletoService.gerarBoleto(request));
    }

    @GetMapping("/boleto/{nossoNumero}")
    @Operation(summary = "Consultar boleto")
    public ResponseEntity<BoletoResponse> consultarBoleto(@PathVariable String nossoNumero) {
        return ResponseEntity.ok(boletoService.consultarBoleto(nossoNumero));
    }

    @DeleteMapping("/boleto/{nossoNumero}")
    @Operation(summary = "Cancelar boleto")
    public ResponseEntity<Void> cancelarBoleto(@PathVariable String nossoNumero) {
        boletoService.cancelarBoleto(nossoNumero);
        return ResponseEntity.noContent().build();
    }

    // OFX Import
    @PostMapping("/ofx/importar")
    @Operation(summary = "Importar extrato OFX")
    public ResponseEntity<List<Map<String, Object>>> importarOfx(@RequestParam("file") MultipartFile file) {
        try {
            List<Map<String, Object>> movimentos = ofxImportService.importarOfx(file.getInputStream());
            return ResponseEntity.ok(movimentos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
