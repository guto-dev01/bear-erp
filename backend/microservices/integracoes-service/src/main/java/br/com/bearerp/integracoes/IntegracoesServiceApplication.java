package br.com.bearerp.integracoes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.integracoes", "br.com.bearerp.integracoesservice", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
// O scan automático de repositórios Mongo usa o pacote da classe @SpringBootApplication
// (br.com.bearerp.integracoes); os repositórios ficam em outro pacote, então apontamos explicitamente.
@EnableMongoRepositories(basePackages = "br.com.bearerp.integracoesservice.domain.repository")
public class IntegracoesServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(IntegracoesServiceApplication.class, args);
    }
}
