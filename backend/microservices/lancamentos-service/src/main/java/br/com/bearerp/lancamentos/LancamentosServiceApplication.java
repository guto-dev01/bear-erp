package br.com.bearerp.lancamentos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.lancamentos", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class LancamentosServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(LancamentosServiceApplication.class, args);
    }
}
