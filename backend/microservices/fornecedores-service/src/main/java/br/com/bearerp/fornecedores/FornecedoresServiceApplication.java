package br.com.bearerp.fornecedores;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.fornecedores", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class FornecedoresServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FornecedoresServiceApplication.class, args);
    }
}
