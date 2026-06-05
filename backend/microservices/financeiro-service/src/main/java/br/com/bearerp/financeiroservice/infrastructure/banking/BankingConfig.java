package br.com.bearerp.financeiroservice.infrastructure.banking;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "banking")
public class BankingConfig {
    private OpenFinance openFinance = new OpenFinance();
    private Pix pix = new Pix();
    private Boleto boleto = new Boleto();

    @Data
    public static class OpenFinance {
        private String clientId;
        private String clientSecret;
        private String redirectUri = "http://localhost:4200/financeiro/openfinance/callback";
        private String baseUrl = "https://api.openfinancebrasil.org.br";
        private boolean sandbox = true;
    }

    @Data
    public static class Pix {
        private String chave;
        private String certificadoPath;
        private String certificadoSenha;
        private String baseUrl = "https://pix.example.com/api/v2";
        private boolean sandbox = true;
    }

    @Data
    public static class Boleto {
        private String apiKey;
        private String baseUrl = "https://boleto.example.com/api/v1";
        private boolean sandbox = true;
    }
}
