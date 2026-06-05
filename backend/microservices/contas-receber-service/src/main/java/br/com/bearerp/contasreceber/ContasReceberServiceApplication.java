package br.com.bearerp.contasreceber;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.contasreceber", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class ContasReceberServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ContasReceberServiceApplication.class, args);
    }
}
