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
public class DominioParser implements MigrationParser {

    private static final Charset CHARSET_WINDOWS = Charset.forName("windows-1252");

    @Override
    public String getSistemaOrigem() {
        return "DOMINIO";
    }

    @Override
    public List<Map<String, Object>> parsePlanoContas(InputStream file) {
        List<Map<String, Object>> contas = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file, CHARSET_WINDOWS))) {
            String line;
            boolean headerSkipped = false;
            while ((line = reader.readLine()) != null) {
                if (!headerSkipped) { headerSkipped = true; continue; }
                line = line.trim();
                if (line.isEmpty()) continue;

                String[] parts = line.split("[|;\\t]");
                if (parts.length < 3) continue;

                Map<String, Object> conta = new LinkedHashMap<>();
                conta.put("codigo", parts[0].trim());
                conta.put("descricao", parts[1].trim());
                conta.put("natureza", parts.length > 2 ? parts[2].trim() : "");
                conta.put("tipo", determinarTipoConta(parts[0].trim()));
                conta.put("grau", parts[0].trim().replaceAll("[^.]", "").length() + 1);
                conta.put("classificacao", classificarConta(parts[0].trim()));
                if (parts.length > 3) conta.put("contaPai", parts[3].trim());
                contas.add(conta);
            }
        } catch (Exception e) {
            log.error("Erro ao parsear plano de contas Domínio: {}", e.getMessage());
            throw new RuntimeException("Falha ao importar plano de contas do Domínio", e);
        }
        log.info("Parseadas {} contas do Domínio", contas.size());
        return contas;
    }

    @Override
    public List<Map<String, Object>> parseLancamentos(InputStream file) {
        List<Map<String, Object>> lancamentos = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file, CHARSET_WINDOWS))) {
            String line;
            boolean headerSkipped = false;
            while ((line = reader.readLine()) != null) {
                if (!headerSkipped) { headerSkipped = true; continue; }
                line = line.trim();
                if (line.isEmpty()) continue;

                String[] parts = line.split("[|;\\t]");
                if (parts.length < 5) continue;

                Map<String, Object> lancamento = new LinkedHashMap<>();
                lancamento.put("data", parts[0].trim());
                lancamento.put("contaDebito", parts[1].trim());
                lancamento.put("contaCredito", parts[2].trim());
                lancamento.put("valor", parseBigDecimal(parts[3].trim()));
                lancamento.put("historico", parts[4].trim());
                if (parts.length > 5) lancamento.put("documento", parts[5].trim());
                if (parts.length > 6) lancamento.put("complemento", parts[6].trim());
                lancamentos.add(lancamento);
            }
        } catch (Exception e) {
            log.error("Erro ao parsear lançamentos Domínio: {}", e.getMessage());
            throw new RuntimeException("Falha ao importar lançamentos do Domínio", e);
        }
        log.info("Parseados {} lançamentos do Domínio", lancamentos.size());
        return lancamentos;
    }

    @Override
    public List<Map<String, Object>> parseSaldos(InputStream file) {
        List<Map<String, Object>> saldos = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file, CHARSET_WINDOWS))) {
            String line;
            boolean headerSkipped = false;
            while ((line = reader.readLine()) != null) {
                if (!headerSkipped) { headerSkipped = true; continue; }
                line = line.trim();
                if (line.isEmpty()) continue;

                String[] parts = line.split("[|;\\t]");
                if (parts.length < 3) continue;

                Map<String, Object> saldo = new LinkedHashMap<>();
                saldo.put("conta", parts[0].trim());
                saldo.put("saldoAnterior", parseBigDecimal(parts[1].trim()));
                saldo.put("debitos", parts.length > 2 ? parseBigDecimal(parts[2].trim()) : BigDecimal.ZERO);
                saldo.put("creditos", parts.length > 3 ? parseBigDecimal(parts[3].trim()) : BigDecimal.ZERO);
                saldo.put("saldoAtual", parts.length > 4 ? parseBigDecimal(parts[4].trim()) : BigDecimal.ZERO);
                saldo.put("competencia", parts.length > 5 ? parts[5].trim() : "");
                saldos.add(saldo);
            }
        } catch (Exception e) {
            log.error("Erro ao parsear saldos Domínio: {}", e.getMessage());
            throw new RuntimeException("Falha ao importar saldos do Domínio", e);
        }
        return saldos;
    }

    @Override
    public List<Map<String, Object>> parseClientes(InputStream file) {
        return parseCadastro(file, "cliente");
    }

    @Override
    public List<Map<String, Object>> parseFornecedores(InputStream file) {
        return parseCadastro(file, "fornecedor");
    }

    @Override
    public List<Map<String, Object>> parseEmpresas(InputStream file) {
        return parseCadastro(file, "empresa");
    }

    private List<Map<String, Object>> parseCadastro(InputStream file, String tipo) {
        List<Map<String, Object>> registros = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file, CHARSET_WINDOWS))) {
            String line;
            String[] headers = null;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] parts = line.split("[|;\\t]");
                if (headers == null) {
                    headers = parts;
                    continue;
                }
                Map<String, Object> registro = new LinkedHashMap<>();
                for (int i = 0; i < Math.min(headers.length, parts.length); i++) {
                    registro.put(normalizarCampo(headers[i].trim()), parts[i].trim());
                }
                registro.put("tipoCadastro", tipo);
                registros.add(registro);
            }
        } catch (Exception e) {
            log.error("Erro ao parsear {} Domínio: {}", tipo, e.getMessage());
            throw new RuntimeException("Falha ao importar " + tipo + " do Domínio", e);
        }
        return registros;
    }

    private String determinarTipoConta(String codigo) {
        if (codigo.startsWith("1")) return "ATIVO";
        if (codigo.startsWith("2")) return "PASSIVO";
        if (codigo.startsWith("3")) return "RECEITA";
        if (codigo.startsWith("4")) return "DESPESA";
        if (codigo.startsWith("5")) return "CUSTO";
        return "OUTROS";
    }

    private String classificarConta(String codigo) {
        int pontos = codigo.replaceAll("[^.]", "").length();
        return pontos == 0 ? "SINTETICA" : "ANALITICA";
    }

    private BigDecimal parseBigDecimal(String valor) {
        try {
            valor = valor.replace(".", "").replace(",", ".");
            return new BigDecimal(valor);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private String normalizarCampo(String campo) {
        return campo.toLowerCase()
                .replaceAll("[áàã]", "a").replaceAll("[éê]", "e")
                .replaceAll("[íì]", "i").replaceAll("[óòõ]", "o")
                .replaceAll("[úù]", "u").replaceAll("[ç]", "c")
                .replaceAll("[^a-z0-9]", "_").replaceAll("_+", "_");
    }
}
