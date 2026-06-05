package br.com.bearerp.financeiro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.financeiro", "br.com.bearerp.financeiroservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = {"br.com.bearerp.financeiro", "br.com.bearerp.financeiroservice"})
public class FinanceiroServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FinanceiroServiceApplication.class, args);
    }
}
