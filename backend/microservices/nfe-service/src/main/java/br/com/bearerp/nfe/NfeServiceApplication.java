package br.com.bearerp.nfe;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.nfe", "br.com.bearerp.nfeservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class NfeServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(NfeServiceApplication.class, args);
    }
}
