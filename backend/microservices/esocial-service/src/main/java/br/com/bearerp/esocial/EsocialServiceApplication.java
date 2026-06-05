package br.com.bearerp.esocial;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.esocial", "br.com.bearerp.esocialservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class EsocialServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(EsocialServiceApplication.class, args);
    }
}
