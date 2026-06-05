package br.com.bearerp.patrimonio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.patrimonio", "br.com.bearerp.patrimonioservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class PatrimonioServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PatrimonioServiceApplication.class, args);
    }
}
