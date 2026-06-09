package br.com.bearerp.integracoesservice.infrastructure.cnpj;

import br.com.bearerp.common.util.CpfCnpjValidator;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.integracoesservice.infrastructure.config.IntegracaoProperties;
import br.com.bearerp.integracoesservice.infrastructure.exception.DocumentoInvalidoException;
import br.com.bearerp.integracoesservice.infrastructure.exception.ProvedorExternoException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * Consulta de CNPJ na BrasilAPI (configurável via {@code integracoes.cnpj.url}),
 * preenchimento automático de dados cadastrais e score de fornecedor.
 *
 * A chamada externa roda server-side (não mais direto do navegador), passando
 * pelo gateway autenticado.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultaCnpjService {

    private final RestClient integracoesRestClient;
    private final IntegracaoProperties props;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DadosCnpj {
        private String cnpj;
        private String razaoSocial;
        private String nomeFantasia;
        private String situacao;             // ATIVA, INAPTA, SUSPENSA, BAIXADA
        private LocalDate dataSituacao;
        private String motivoSituacao;
        private String naturezaJuridica;
        private String porte;               // ME, EPP, DEMAIS
        private LocalDate dataAbertura;

        // Endereço
        private String logradouro;
        private String numero;
        private String complemento;
        private String bairro;
        private String municipio;
        private String uf;
        private String cep;

        // Contato
        private String telefone;
        private String email;

        // Atividades
        private String cnaePrincipal;
        private String cnaePrincipalDescricao;
        private List<String> cnaeSecundarios;

        // Sócios
        private List<Socio> socios;

        // Fiscal
        private String inscricaoEstadual;
        private String inscricaoMunicipal;
        private String regimeTributario;     // SIMPLES, PRESUMIDO, REAL
        private boolean optanteSimplesNacional;
        private boolean optanteMei;
        private LocalDate dataOpcaoSimples;

        // Validação
        private boolean ativa;
        private boolean aptoParaNegocio;
        private List<String> alertas;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Socio {
        private String nome;
        private String cpfCnpj;
        private String qualificacao;
        private LocalDate dataEntrada;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ScoreFornecedor {
        private String cnpj;
        private String razaoSocial;
        private int score;                   // 0-100
        private String classificacao;        // A, B, C, D, E
        private int anosAtividade;
        private boolean situacaoRegular;
        private boolean semRestricoes;
        private int pontuacaoPontualidade;
        private int pontuacaoQualidade;
        private String recomendacao;
    }

    /**
     * Consulta o CNPJ na BrasilAPI e mapeia para {@link DadosCnpj}.
     */
    public DadosCnpj consultarCnpj(String cnpj) {
        String cnpjLimpo = cnpj == null ? "" : cnpj.replaceAll("\\D", "");
        if (!CpfCnpjValidator.isValidCnpj(cnpjLimpo)) {
            throw new DocumentoInvalidoException("CNPJ inválido");
        }

        log.info("Consultando CNPJ: {}", cnpjLimpo);
        JsonNode r;
        try {
            r = integracoesRestClient.get()
                    .uri(props.getCnpj().getUrl() + "/" + cnpjLimpo)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResourceNotFoundException("CNPJ não encontrado na Receita");
        } catch (RestClientException e) {
            log.error("Falha de rede ao consultar CNPJ: {}", e.getMessage());
            throw new ProvedorExternoException("Falha ao consultar o provedor de CNPJ");
        }
        if (r == null) {
            throw new ProvedorExternoException("Resposta vazia do provedor de CNPJ");
        }

        String situacao = upper(texto(r, "descricao_situacao_cadastral", "situacao"));
        DadosCnpj dados = DadosCnpj.builder()
                .cnpj(cnpjLimpo)
                .razaoSocial(texto(r, "razao_social"))
                .nomeFantasia(coalesce(texto(r, "nome_fantasia"), texto(r, "razao_social")))
                .situacao(situacao)
                .dataSituacao(data(r, "data_situacao_cadastral"))
                .motivoSituacao(texto(r, "descricao_motivo_situacao_cadastral"))
                .naturezaJuridica(texto(r, "natureza_juridica"))
                .porte(texto(r, "porte", "descricao_porte"))
                .dataAbertura(data(r, "data_inicio_atividade", "data_abertura"))
                .logradouro(juntar(texto(r, "descricao_tipo_de_logradouro"), texto(r, "logradouro")))
                .numero(texto(r, "numero"))
                .complemento(texto(r, "complemento"))
                .bairro(texto(r, "bairro"))
                .municipio(texto(r, "municipio"))
                .uf(texto(r, "uf"))
                .cep(somenteDigitos(texto(r, "cep")))
                .telefone(texto(r, "ddd_telefone_1"))
                .email(texto(r, "email"))
                .cnaePrincipal(texto(r, "cnae_fiscal"))
                .cnaePrincipalDescricao(texto(r, "cnae_fiscal_descricao"))
                .cnaeSecundarios(cnaesSecundarios(r))
                .socios(socios(r))
                .optanteSimplesNacional(bool(r, "opcao_pelo_simples"))
                .optanteMei(bool(r, "opcao_pelo_mei"))
                .ativa("ATIVA".equals(situacao))
                .aptoParaNegocio("ATIVA".equals(situacao))
                .alertas(new ArrayList<>())
                .build();

        if (!"ATIVA".equals(dados.getSituacao())) {
            dados.setAptoParaNegocio(false);
            dados.getAlertas().add("CNPJ com situação: " + dados.getSituacao() + " — verificar antes de fazer negócio");
        }
        if (dados.getDataAbertura() != null && dados.getDataAbertura().isAfter(LocalDate.now().minusYears(1))) {
            dados.getAlertas().add("Empresa com menos de 1 ano de atividade — risco elevado");
        }
        return dados;
    }

    /**
     * Consulta de Inscrição Estadual no SINTEGRA (ainda stub — fora do escopo da fatia atual).
     */
    public java.util.Map<String, Object> consultarSintegra(String uf, String inscricaoEstadual) {
        java.util.Map<String, Object> resultado = new java.util.LinkedHashMap<>();
        resultado.put("uf", uf);
        resultado.put("inscricaoEstadual", inscricaoEstadual);
        resultado.put("situacao", "HABILITADA");
        resultado.put("contribuinte", true);
        return resultado;
    }

    /**
     * Score do fornecedor a partir dos dados reais do CNPJ.
     */
    public ScoreFornecedor calcularScoreFornecedor(String cnpj) {
        DadosCnpj dados = consultarCnpj(cnpj);

        int score = 50; // Base
        int anosAtividade = 0;
        if (dados.getDataAbertura() != null) {
            anosAtividade = LocalDate.now().getYear() - dados.getDataAbertura().getYear();
            score += Math.min(anosAtividade * 3, 20);
        }
        if (dados.isAtiva()) score += 15;
        if ("DEMAIS".equals(dados.getPorte())) score += 10;
        else if ("EPP".equals(dados.getPorte())) score += 5;
        if (dados.getAlertas().isEmpty()) score += 5;
        else score -= dados.getAlertas().size() * 5;
        score = Math.max(0, Math.min(100, score));

        String classificacao;
        if (score >= 85) classificacao = "A";
        else if (score >= 70) classificacao = "B";
        else if (score >= 50) classificacao = "C";
        else if (score >= 30) classificacao = "D";
        else classificacao = "E";

        String recomendacao = switch (classificacao) {
            case "A" -> "Fornecedor confiável — risco baixo";
            case "B" -> "Fornecedor adequado — risco moderado";
            case "C" -> "Fornecedor aceitável — monitorar";
            case "D" -> "Fornecedor com restrições — cautela recomendada";
            case "E" -> "Fornecedor de alto risco — não recomendado";
            default -> "Sem classificação";
        };

        return ScoreFornecedor.builder()
                .cnpj(cnpj)
                .razaoSocial(dados.getRazaoSocial())
                .score(score)
                .classificacao(classificacao)
                .anosAtividade(anosAtividade)
                .situacaoRegular(dados.isAtiva())
                .semRestricoes(dados.getAlertas().isEmpty())
                .recomendacao(recomendacao)
                .build();
    }

    // ── helpers de parsing (defensivos) ─────────────────────────

    private static List<String> cnaesSecundarios(JsonNode r) {
        List<String> out = new ArrayList<>();
        JsonNode arr = r.get("cnaes_secundarios");
        if (arr != null && arr.isArray()) {
            for (JsonNode n : arr) {
                String codigo = texto(n, "codigo");
                if (codigo != null) out.add(codigo);
            }
        }
        return out;
    }

    private static List<Socio> socios(JsonNode r) {
        List<Socio> out = new ArrayList<>();
        JsonNode arr = r.get("qsa");
        if (arr != null && arr.isArray()) {
            for (JsonNode n : arr) {
                out.add(Socio.builder()
                        .nome(texto(n, "nome_socio", "nome"))
                        .cpfCnpj(texto(n, "cnpj_cpf_do_socio", "cpf_cnpj_socio"))
                        .qualificacao(texto(n, "qualificacao_socio", "qualificacao"))
                        .build());
            }
        }
        return out;
    }

    private static String texto(JsonNode node, String... chaves) {
        if (node == null) return null;
        for (String c : chaves) {
            JsonNode v = node.get(c);
            if (v != null && !v.isNull() && StringUtils.hasText(v.asText())) {
                return v.asText().trim();
            }
        }
        return null;
    }

    private static boolean bool(JsonNode node, String chave) {
        JsonNode v = node.get(chave);
        return v != null && v.asBoolean(false);
    }

    private static LocalDate data(JsonNode node, String... chaves) {
        String t = texto(node, chaves);
        if (t == null) return null;
        try {
            return LocalDate.parse(t.length() > 10 ? t.substring(0, 10) : t);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String upper(String s) {
        return s == null ? null : s.toUpperCase();
    }

    private static String coalesce(String a, String b) {
        return StringUtils.hasText(a) ? a : b;
    }

    private static String juntar(String tipo, String logradouro) {
        if (!StringUtils.hasText(tipo)) return logradouro;
        if (!StringUtils.hasText(logradouro)) return tipo;
        return (tipo + " " + logradouro).trim();
    }

    private static String somenteDigitos(String v) {
        return v == null ? null : v.replaceAll("\\D", "");
    }
}
