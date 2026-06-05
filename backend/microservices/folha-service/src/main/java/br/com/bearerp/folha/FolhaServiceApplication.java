package br.com.bearerp.folha;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.folha", "br.com.bearerp.folhaservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = {"br.com.bearerp.folha", "br.com.bearerp.folhaservice"})
public class FolhaServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FolhaServiceApplication.class, args);
    }
}
