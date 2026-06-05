package br.com.bearerp.integracoes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.integracoes", "br.com.bearerp.integracoesservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class IntegracoesServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(IntegracoesServiceApplication.class, args);
    }
}
