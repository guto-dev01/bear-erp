package br.com.bearerp.empresa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.empresa", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
@EnableAsync
public class EmpresaServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(EmpresaServiceApplication.class, args);
    }
}
