package br.com.bearerp.certificado;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.certificado", "br.com.bearerp.certificadoservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class CertificadoServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CertificadoServiceApplication.class, args);
    }
}
