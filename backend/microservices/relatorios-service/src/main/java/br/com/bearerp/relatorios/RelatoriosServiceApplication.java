package br.com.bearerp.relatorios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.relatorios", "br.com.bearerp.relatoriosservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class RelatoriosServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(RelatoriosServiceApplication.class, args);
    }
}
