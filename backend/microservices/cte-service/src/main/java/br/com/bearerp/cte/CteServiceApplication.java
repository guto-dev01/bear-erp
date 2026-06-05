package br.com.bearerp.cte;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.cte", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class CteServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CteServiceApplication.class, args);
    }
}
