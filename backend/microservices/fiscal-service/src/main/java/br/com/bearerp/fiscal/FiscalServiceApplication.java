package br.com.bearerp.fiscal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.fiscal", "br.com.bearerp.fiscalservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class FiscalServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FiscalServiceApplication.class, args);
    }
}
