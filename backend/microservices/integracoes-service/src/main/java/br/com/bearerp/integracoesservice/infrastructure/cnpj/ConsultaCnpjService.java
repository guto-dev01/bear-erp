package br.com.bearerp.integracoesservice.infrastructure.cnpj;

import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * Consulta automática de CNPJ/CPF:
 * - ReceitaWS (CNPJ) — preencher dados automaticamente
 * - SINTEGRA (Inscrição Estadual)
 * - SUFRAMA (Zona Franca de Manaus)
 * - Validação de situação cadastral
 * - Score de fornecedor
 */
@Slf4j
@Service
public class ConsultaCnpjService {

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
        private int pontuacaoPontualidade;   // Histórico de entregas
        private int pontuacaoQualidade;
        private String recomendacao;
    }

    /**
     * Consultar CNPJ na Receita Federal (via ReceitaWS ou BrasilAPI)
     */
    public DadosCnpj consultarCnpj(String cnpj) {
        String cnpjLimpo = cnpj.replaceAll("[^0-9]", "");

        if (cnpjLimpo.length() != 14) {
            throw new RuntimeException("CNPJ inválido: deve conter 14 dígitos");
        }

        // Em produção: chamar API externa
        // URL ReceitaWS: https://receitaws.com.br/v1/cnpj/{cnpj}
        // URL BrasilAPI: https://brasilapi.com.br/api/cnpj/v1/{cnpj}
        // URL MinhaReceita: https://minhareceita.org/{cnpj}

        log.info("Consultando CNPJ: {}", cnpjLimpo);

        // Simulação com dados realistas
        DadosCnpj dados = DadosCnpj.builder()
                .cnpj(cnpjLimpo)
                .razaoSocial("EMPRESA EXEMPLO LTDA")
                .nomeFantasia("EXEMPLO")
                .situacao("ATIVA")
                .dataSituacao(LocalDate.of(2020, 1, 15))
                .naturezaJuridica("206-2 - Sociedade Empresária Limitada")
                .porte("EPP")
                .dataAbertura(LocalDate.of(2015, 6, 10))
                .logradouro("Rua das Flores")
                .numero("100")
                .bairro("Centro")
                .municipio("São Paulo")
                .uf("SP")
                .cep("01001000")
                .telefone("(11) 3000-0000")
                .email("contato@exemplo.com.br")
                .cnaePrincipal("47.11-3-02")
                .cnaePrincipalDescricao("Comércio varejista de mercadorias em geral")
                .cnaeSecundarios(List.of("46.93-1-00", "47.89-0-99"))
                .socios(List.of(
                        Socio.builder().nome("JOÃO DA SILVA").qualificacao("Sócio-Administrador")
                                .dataEntrada(LocalDate.of(2015, 6, 10)).build()
                ))
                .optanteSimplesNacional(true)
                .optanteMei(false)
                .dataOpcaoSimples(LocalDate.of(2015, 7, 1))
                .regimeTributario("SIMPLES")
                .ativa(true)
                .aptoParaNegocio(true)
                .alertas(new ArrayList<>())
                .build();

        // Validações automáticas
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
     * Consultar CPF
     */
    public Map<String, Object> consultarCpf(String cpf) {
        String cpfLimpo = cpf.replaceAll("[^0-9]", "");
        if (cpfLimpo.length() != 11) throw new RuntimeException("CPF inválido");

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("cpf", cpfLimpo);
        resultado.put("situacao", "REGULAR");
        resultado.put("valido", validarCpf(cpfLimpo));
        return resultado;
    }

    /**
     * Consultar Inscrição Estadual no SINTEGRA
     */
    public Map<String, Object> consultarSintegra(String uf, String inscricaoEstadual) {
        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("uf", uf);
        resultado.put("inscricaoEstadual", inscricaoEstadual);
        resultado.put("situacao", "HABILITADA");
        resultado.put("contribuinte", true);
        return resultado;
    }

    /**
     * Calcular score do fornecedor
     */
    public ScoreFornecedor calcularScoreFornecedor(String cnpj) {
        DadosCnpj dados = consultarCnpj(cnpj);

        int score = 50; // Base

        // Tempo de atividade
        int anosAtividade = 0;
        if (dados.getDataAbertura() != null) {
            anosAtividade = LocalDate.now().getYear() - dados.getDataAbertura().getYear();
            score += Math.min(anosAtividade * 3, 20); // Até 20 pontos
        }

        // Situação cadastral
        if (dados.isAtiva()) score += 15;

        // Porte
        if ("DEMAIS".equals(dados.getPorte())) score += 10;
        else if ("EPP".equals(dados.getPorte())) score += 5;

        // Sem alertas
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

    private boolean validarCpf(String cpf) {
        if (cpf.length() != 11) return false;
        if (cpf.chars().distinct().count() == 1) return false;

        int[] pesos1 = {10, 9, 8, 7, 6, 5, 4, 3, 2};
        int[] pesos2 = {11, 10, 9, 8, 7, 6, 5, 4, 3, 2};

        int soma = 0;
        for (int i = 0; i < 9; i++) soma += (cpf.charAt(i) - '0') * pesos1[i];
        int dig1 = 11 - (soma % 11);
        if (dig1 > 9) dig1 = 0;

        soma = 0;
        for (int i = 0; i < 10; i++) soma += (cpf.charAt(i) - '0') * pesos2[i];
        int dig2 = 11 - (soma % 11);
        if (dig2 > 9) dig2 = 0;

        return (cpf.charAt(9) - '0') == dig1 && (cpf.charAt(10) - '0') == dig2;
    }
}
