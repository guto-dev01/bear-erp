package br.com.bearerp.obrigacoes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.obrigacoes", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class ObrigacoesServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ObrigacoesServiceApplication.class, args);
    }
}
