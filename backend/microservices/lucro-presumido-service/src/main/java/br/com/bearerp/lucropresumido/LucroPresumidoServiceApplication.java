package br.com.bearerp.lucropresumido;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.lucropresumido", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class LucroPresumidoServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(LucroPresumidoServiceApplication.class, args);
    }
}
