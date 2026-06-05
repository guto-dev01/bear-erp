package br.com.bearerp.lucroreal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.lucroreal", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class LucroRealServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(LucroRealServiceApplication.class, args);
    }
}
