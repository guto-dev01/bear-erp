package br.com.bearerp.integracoesservice.infrastructure.migration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.util.*;

@Slf4j
@Component
public class FortesParser implements MigrationParser {

    private static final Charset CHARSET_WINDOWS = Charset.forName("windows-1252");

    @Override
    public String getSistemaOrigem() {
        return "FORTES";
    }

    @Override
    public List<Map<String, Object>> parsePlanoContas(InputStream file) {
        List<Map<String, Object>> contas = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file, CHARSET_WINDOWS))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                // Fortes usa formato: CODIGO;DESCRICAO;TIPO;NATUREZA;GRAU
                String[] parts = line.split(";");
                if (parts.length < 2) continue;

                Map<String, Object> conta = new LinkedHashMap<>();
                conta.put("codigo", parts[0].trim());
                conta.put("descricao", parts[1].trim());
                if (parts.length > 2) conta.put("tipo", parts[2].trim());
                if (parts.length > 3) conta.put("natureza", parts[3].trim());
                if (parts.length > 4) conta.put("grau", Integer.parseInt(parts[4].trim()));
                contas.add(conta);
            }
        } catch (Exception e) {
            log.error("Erro ao parsear plano de contas Fortes: {}", e.getMessage());
            throw new RuntimeException("Falha ao importar plano de contas do Fortes", e);
        }
        return contas;
    }

    @Override
    public List<Map<String, Object>> parseLancamentos(InputStream file) {
        List<Map<String, Object>> lancamentos = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file, CHARSET_WINDOWS))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                // Fortes: DATA;DEBITO;CREDITO;VALOR;HISTORICO;DOC
                String[] parts = line.split(";");
                if (parts.length < 5) continue;

                Map<String, Object> lancamento = new LinkedHashMap<>();
                lancamento.put("data", parts[0].trim());
                lancamento.put("contaDebito", parts[1].trim());
                lancamento.put("contaCredito", parts[2].trim());
                lancamento.put("valor", new BigDecimal(parts[3].trim().replace(",", ".")));
                lancamento.put("historico", parts[4].trim());
                if (parts.length > 5) lancamento.put("documento", parts[5].trim());
                lancamentos.add(lancamento);
            }
        } catch (Exception e) {
            log.error("Erro ao parsear lançamentos Fortes: {}", e.getMessage());
            throw new RuntimeException("Falha ao importar lançamentos do Fortes", e);
        }
        return lancamentos;
    }

    @Override
    public List<Map<String, Object>> parseSaldos(InputStream file) {
        List<Map<String, Object>> saldos = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file, CHARSET_WINDOWS))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] parts = line.split(";");
                if (parts.length < 2) continue;
                Map<String, Object> saldo = new LinkedHashMap<>();
                saldo.put("conta", parts[0].trim());
                saldo.put("saldoAtual", new BigDecimal(parts[1].trim().replace(",", ".")));
                if (parts.length > 2) saldo.put("competencia", parts[2].trim());
                saldos.add(saldo);
            }
        } catch (Exception e) {
            throw new RuntimeException("Falha ao importar saldos do Fortes", e);
        }
        return saldos;
    }

    @Override
    public List<Map<String, Object>> parseClientes(InputStream file) { return parseCSV(file); }

    @Override
    public List<Map<String, Object>> parseFornecedores(InputStream file) { return parseCSV(file); }

    @Override
    public List<Map<String, Object>> parseEmpresas(InputStream file) { return parseCSV(file); }

    private List<Map<String, Object>> parseCSV(InputStream file) {
        List<Map<String, Object>> registros = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file, CHARSET_WINDOWS))) {
            String line;
            String[] headers = null;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(";");
                if (headers == null) { headers = parts; continue; }
                Map<String, Object> registro = new LinkedHashMap<>();
                for (int i = 0; i < Math.min(headers.length, parts.length); i++) {
                    registro.put(headers[i].trim().toLowerCase(), parts[i].trim());
                }
                registros.add(registro);
            }
        } catch (Exception e) {
            throw new RuntimeException("Falha ao parsear CSV Fortes", e);
        }
        return registros;
    }
}
