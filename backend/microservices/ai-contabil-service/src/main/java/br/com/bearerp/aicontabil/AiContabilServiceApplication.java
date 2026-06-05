package br.com.bearerp.aicontabil;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.aicontabil", "br.com.bearerp.aicontabilservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class AiContabilServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiContabilServiceApplication.class, args);
    }
}
