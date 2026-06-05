package br.com.bearerp.tributario;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.tributario", "br.com.bearerp.tributarioservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class TributarioServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TributarioServiceApplication.class, args);
    }
}
