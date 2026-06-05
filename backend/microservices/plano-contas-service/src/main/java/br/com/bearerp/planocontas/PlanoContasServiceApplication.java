package br.com.bearerp.planocontas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.planocontas", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class PlanoContasServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PlanoContasServiceApplication.class, args);
    }
}
