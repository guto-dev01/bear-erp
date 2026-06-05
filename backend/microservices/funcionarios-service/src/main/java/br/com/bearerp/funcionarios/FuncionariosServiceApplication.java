package br.com.bearerp.funcionarios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.funcionarios", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class FuncionariosServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FuncionariosServiceApplication.class, args);
    }
}
