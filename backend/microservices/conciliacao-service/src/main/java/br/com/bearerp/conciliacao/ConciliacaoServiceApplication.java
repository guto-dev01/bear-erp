package br.com.bearerp.conciliacao;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.conciliacao", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class ConciliacaoServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConciliacaoServiceApplication.class, args);
    }
}
