package br.com.bearerp.sped;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.sped", "br.com.bearerp.spedservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class SpedServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpedServiceApplication.class, args);
    }
}
