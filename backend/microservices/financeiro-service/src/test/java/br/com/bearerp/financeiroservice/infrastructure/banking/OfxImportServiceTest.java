package br.com.bearerp.financeiroservice.infrastructure.banking;

import br.com.bearerp.financeiroservice.infrastructure.banking.ofx.OfxImportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("OfxImportService")
class OfxImportServiceTest {

    private OfxImportService ofxImportService;

    @BeforeEach
    void setUp() {
        ofxImportService = new OfxImportService();
    }

    @Test
    @DisplayName("deve importar transações de um arquivo OFX")
    void deveImportarTransacoes() {
        String ofxContent = """
                OFXHEADER:100
                <OFX>
                <BANKMSGSRSV1>
                <STMTTRNRS>
                <STMTRS>
                <BANKACCTFROM>
                <BANKID>001
                <ACCTID>12345-6
                </BANKACCTFROM>
                <BANKTRANLIST>
                <STMTTRN>
                <TRNTYPE>CREDIT
                <DTPOSTED>20240315
                <TRNAMT>1500.00
                <FITID>2024031501
                <MEMO>PIX Recebido - Cliente ABC
                </STMTTRN>
                <STMTTRN>
                <TRNTYPE>DEBIT
                <DTPOSTED>20240316
                <TRNAMT>-250.50
                <FITID>2024031602
                <MEMO>Pagamento Fornecedor XYZ
                </STMTTRN>
                </BANKTRANLIST>
                <LEDGERBAL>
                <BALAMT>5000.00
                </LEDGERBAL>
                </STMTRS>
                </STMTTRNRS>
                </BANKMSGSRSV1>
                </OFX>
                """;

        InputStream input = new ByteArrayInputStream(ofxContent.getBytes(StandardCharsets.UTF_8));
        List<Map<String, Object>> movimentos = ofxImportService.importarOfx(input);

        assertEquals(2, movimentos.size());

        Map<String, Object> credito = movimentos.get(0);
        assertEquals("CREDITO", credito.get("tipo"));
        assertEquals(LocalDate.of(2024, 3, 15), credito.get("data"));
        assertEquals(new BigDecimal("1500.00"), credito.get("valor"));
        assertEquals("2024031501", credito.get("fitId"));
        assertEquals("PIX Recebido - Cliente ABC", credito.get("descricao"));

        Map<String, Object> debito = movimentos.get(1);
        assertEquals("DEBITO", debito.get("tipo"));
        assertEquals(new BigDecimal("-250.50"), debito.get("valor"));
    }

    @Test
    @DisplayName("deve retornar lista vazia para OFX sem transações")
    void deveRetornarVazioSemTransacoes() {
        String ofxContent = """
                OFXHEADER:100
                <OFX>
                <BANKMSGSRSV1>
                <STMTTRNRS>
                <STMTRS>
                <BANKTRANLIST>
                </BANKTRANLIST>
                </STMTRS>
                </STMTTRNRS>
                </BANKMSGSRSV1>
                </OFX>
                """;

        InputStream input = new ByteArrayInputStream(ofxContent.getBytes(StandardCharsets.UTF_8));
        List<Map<String, Object>> movimentos = ofxImportService.importarOfx(input);

        assertTrue(movimentos.isEmpty());
    }

    @Test
    @DisplayName("deve usar NAME quando MEMO não está presente")
    void deveUsarNameComoDescricao() {
        String ofxContent = """
                <STMTTRN>
                <TRNTYPE>CREDIT
                <DTPOSTED>20240320
                <TRNAMT>100.00
                <FITID>20240320001
                <NAME>Deposito em Conta
                </STMTTRN>
                """;

        InputStream input = new ByteArrayInputStream(ofxContent.getBytes(StandardCharsets.UTF_8));
        List<Map<String, Object>> movimentos = ofxImportService.importarOfx(input);

        assertEquals(1, movimentos.size());
        assertEquals("Deposito em Conta", movimentos.get(0).get("descricao"));
    }

    @Test
    @DisplayName("deve extrair CHECKNUM como documento")
    void deveExtrairChecknum() {
        String ofxContent = """
                <STMTTRN>
                <TRNTYPE>DEBIT
                <DTPOSTED>20240320
                <TRNAMT>-500.00
                <FITID>20240320002
                <CHECKNUM>000123
                <MEMO>Cheque compensado
                </STMTTRN>
                """;

        InputStream input = new ByteArrayInputStream(ofxContent.getBytes(StandardCharsets.UTF_8));
        List<Map<String, Object>> movimentos = ofxImportService.importarOfx(input);

        assertEquals("000123", movimentos.get(0).get("documento"));
    }
}
