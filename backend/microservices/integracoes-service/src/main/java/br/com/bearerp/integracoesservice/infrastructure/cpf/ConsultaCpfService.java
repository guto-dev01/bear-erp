package br.com.bearerp.integracoesservice.infrastructure.cpf;

import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.common.util.CpfCnpjValidator;
import br.com.bearerp.integracoesservice.infrastructure.config.IntegracaoProperties;
import br.com.bearerp.integracoesservice.infrastructure.exception.DocumentoInvalidoException;
import br.com.bearerp.integracoesservice.infrastructure.exception.ProvedorExternoException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Consulta de dados de pessoa física por CPF via Hub do Desenvolvedor.
 *
 * Porta a lógica testada da Appwrite Function (functions/_shared/hub/consulta-cpf.js):
 * valida o CPF, monta {@code cpf}/{@code data}/{@code token}, trata o retorno lógico
 * {@code status}/{@code return} (NOK) e normaliza defensivamente os campos (o Hub
 * varia nomes conforme o plano). O token vive só aqui (env), nunca no frontend.
 *
 * Contrato Hub (v2): GET {base}?cpf={cpf}&data={dd/mm/aaaa}&token={token}
 *   200 { "status": true,  "return": "OK",  "result": { ... } }
 *   200 { "status": false, "return": "NOK", "message": "..." }
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultaCpfService {

    private static final Pattern DATA_ISO = Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})$");
    private static final Pattern DATA_BR = Pattern.compile("^(\\d{2})/(\\d{2})/(\\d{4})$");

    private final RestClient integracoesRestClient;
    private final IntegracaoProperties props;

    /**
     * @param cpf             CPF com ou sem máscara
     * @param dataNascimento  opcional (alguns planos exigem); aceita aaaa-mm-dd ou dd/mm/aaaa
     */
    public DadosCpf consultar(String cpf, String dataNascimento) {
        String cpfLimpo = somenteDigitos(cpf);
        if (!CpfCnpjValidator.isValidCpf(cpfLimpo)) {
            throw new DocumentoInvalidoException("CPF inválido");
        }
        String token = props.getHub().getCpfToken();
        if (!StringUtils.hasText(token)) {
            log.error("CPF_API_TOKEN não configurado no integracoes-service");
            throw new ProvedorExternoException("Integração de CPF não configurada");
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(props.getHub().getCpfUrl())
                .queryParam("cpf", cpfLimpo)
                .queryParam("token", token);
        String dataBr = paraDataBr(dataNascimento);
        if (dataBr != null) {
            builder.queryParam("data", dataBr);
        }
        URI uri = builder.build().encode().toUri();

        JsonNode corpo;
        try {
            corpo = integracoesRestClient.get()
                    .uri(uri)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            log.error("Falha de rede ao consultar o Hub (CPF): {}", e.getMessage());
            throw new ProvedorExternoException("Falha ao consultar o provedor de CPF");
        }
        if (corpo == null) {
            throw new ProvedorExternoException("Resposta vazia do provedor de CPF");
        }

        boolean ok = corpo.path("status").asBoolean(false)
                || "OK".equalsIgnoreCase(corpo.path("return").asText(""));
        if (!ok) {
            String msg = primeiroTexto(corpo, "message", "return");
            throw new ResourceNotFoundException(StringUtils.hasText(msg) ? msg : "CPF não encontrado");
        }

        JsonNode result = corpo.has("result") ? corpo.get("result")
                : corpo.has("data") ? corpo.get("data")
                : corpo;
        return normalizar(cpfLimpo, result);
    }

    // ── normalização defensiva ──────────────────────────────────

    private DadosCpf normalizar(String cpf, JsonNode r) {
        String dataNasc = primeiroTexto(r, "data_nascimento", "nascimento", "dataNascimento");
        return DadosCpf.builder()
                .cpf(cpf)
                .nome(primeiroTexto(r, "nome_da_pf", "nome", "nomeDaPf", "name"))
                .dataNascimento(dataNasc != null ? paraDataIso(dataNasc) : null)
                .situacaoCadastral(primeiroTexto(r, "situacao_cadastral", "situacao", "situacaoCadastral"))
                .dataInscricao(primeiroTexto(r, "data_inscricao", "dataInscricao"))
                .nomeMae(primeiroTexto(r, "nome_mae", "mae", "nomeMae"))
                .genero(primeiroTexto(r, "genero", "sexo", "gender"))
                .build();
    }

    /** Primeiro valor textual não-vazio entre as chaves candidatas. */
    private static String primeiroTexto(JsonNode node, String... chaves) {
        if (node == null) return null;
        for (String c : chaves) {
            JsonNode v = node.get(c);
            if (v != null && !v.isNull() && StringUtils.hasText(v.asText())) {
                return v.asText().trim();
            }
        }
        return null;
    }

    static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    /** Converte entrada (ISO ou BR) para dd/mm/aaaa exigido pelo Hub; null se vazia. */
    static String paraDataBr(String valor) {
        if (!StringUtils.hasText(valor)) return null;
        String txt = valor.trim();
        Matcher iso = DATA_ISO.matcher(txt);
        if (iso.matches()) return iso.group(3) + "/" + iso.group(2) + "/" + iso.group(1);
        return txt; // já em dd/mm/aaaa ou formato desconhecido (deixa o Hub decidir)
    }

    /** Converte dd/mm/aaaa em aaaa-mm-dd (para input[type=date]); devolve original se não casar. */
    static String paraDataIso(String valor) {
        if (!StringUtils.hasText(valor)) return valor;
        Matcher br = DATA_BR.matcher(valor.trim());
        if (br.matches()) return br.group(3) + "-" + br.group(2) + "-" + br.group(1);
        return valor.trim();
    }
}
