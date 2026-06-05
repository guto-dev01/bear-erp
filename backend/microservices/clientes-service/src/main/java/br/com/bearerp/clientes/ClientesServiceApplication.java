package br.com.bearerp.clientes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication(scanBasePackages = {"br.com.bearerp.clientes", "br.com.bearerp.common", "br.com.bearerp.security"})
@EnableMongoAuditing
public class ClientesServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ClientesServiceApplication.class, args);
    }
}
