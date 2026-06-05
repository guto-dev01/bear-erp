package br.com.bearerp.contaspagar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.contaspagar", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class ContasPagarServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ContasPagarServiceApplication.class, args);
    }
}
