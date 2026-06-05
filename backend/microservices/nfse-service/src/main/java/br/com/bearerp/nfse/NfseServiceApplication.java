package br.com.bearerp.nfse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.nfse", "br.com.bearerp.nfseservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class NfseServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(NfseServiceApplication.class, args);
    }
}
