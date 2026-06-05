package br.com.bearerp.simples;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.simples", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class SimplesServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SimplesServiceApplication.class, args);
    }
}
