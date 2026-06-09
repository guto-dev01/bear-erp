package br.com.bearerp.integracoesservice.infrastructure.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuração das integrações externas (prefixo {@code integracoes} no application.yml).
 *
 * Tudo vem de variáveis de ambiente — o token do Hub (secreto) jamais é versionado
 * nem trafega para o frontend; só existe no container deste serviço.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "integracoes")
public class IntegracaoProperties {

    private final Hub hub = new Hub();
    private final Cnpj cnpj = new Cnpj();

    /** Hub do Desenvolvedor — consulta de pessoa física por CPF. */
    @Data
    public static class Hub {
        /** Endpoint base do Hub (v2). */
        private String cpfUrl = "https://ws.hubdodesenvolvedor.com.br/v2/cpf/";
        /** Token do Hub (obrigatório em runtime; vazio no default para não quebrar build/test). */
        private String cpfToken = "";
    }

    /** Consulta de CNPJ (BrasilAPI por padrão). */
    @Data
    public static class Cnpj {
        private String url = "https://brasilapi.com.br/api/cnpj/v1";
    }
}
