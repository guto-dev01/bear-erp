package br.com.bearerp.contabilidade;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.contabilidade", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class ContabilidadeServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ContabilidadeServiceApplication.class, args);
    }
}
