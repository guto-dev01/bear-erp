package br.com.bearerp.financeiroservice.infrastructure.banking.ofx;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OfxImportService {

    public List<Map<String, Object>> importarOfx(InputStream ofxFile) {
        List<Map<String, Object>> movimentos = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(ofxFile))) {
            String line;
            Map<String, Object> currentTx = null;
            boolean inTransaction = false;

            while ((line = reader.readLine()) != null) {
                line = line.trim();

                if (line.equals("<STMTTRN>")) {
                    currentTx = new HashMap<>();
                    inTransaction = true;
                } else if (line.equals("</STMTTRN>") && currentTx != null) {
                    movimentos.add(currentTx);
                    inTransaction = false;
                    currentTx = null;
                } else if (inTransaction && currentTx != null) {
                    if (line.startsWith("<TRNTYPE>")) {
                        String type = extractValue(line, "TRNTYPE");
                        currentTx.put("tipo", "CREDIT".equals(type) ? "CREDITO" : "DEBITO");
                    } else if (line.startsWith("<DTPOSTED>")) {
                        String dt = extractValue(line, "DTPOSTED");
                        if (dt.length() >= 8) {
                            currentTx.put("data", LocalDate.parse(dt.substring(0, 8), DateTimeFormatter.BASIC_ISO_DATE));
                        }
                    } else if (line.startsWith("<TRNAMT>")) {
                        currentTx.put("valor", new BigDecimal(extractValue(line, "TRNAMT")));
                    } else if (line.startsWith("<FITID>")) {
                        currentTx.put("fitId", extractValue(line, "FITID"));
                    } else if (line.startsWith("<MEMO>")) {
                        currentTx.put("descricao", extractValue(line, "MEMO"));
                    } else if (line.startsWith("<NAME>")) {
                        currentTx.put("descricao", extractValue(line, "NAME"));
                    } else if (line.startsWith("<CHECKNUM>")) {
                        currentTx.put("documento", extractValue(line, "CHECKNUM"));
                    }
                }

                // Account info
                if (line.startsWith("<BANKID>")) {
                    // Código do banco
                } else if (line.startsWith("<ACCTID>")) {
                    // Número da conta
                } else if (line.startsWith("<BALAMT>")) {
                    // Saldo
                }
            }

            log.info("Importados {} movimentos do arquivo OFX", movimentos.size());
        } catch (Exception e) {
            log.error("Erro ao importar OFX: {}", e.getMessage());
            throw new RuntimeException("Falha ao importar arquivo OFX", e);
        }

        return movimentos;
    }

    private String extractValue(String line, String tag) {
        String prefix = "<" + tag + ">";
        if (line.startsWith(prefix)) {
            return line.substring(prefix.length()).trim();
        }
        return "";
    }
}
