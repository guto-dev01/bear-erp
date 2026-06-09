package br.com.bearerp.integracoesservice.infrastructure.config;

import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Cliente HTTP síncrono para as consultas externas (Hub CPF, BrasilAPI CNPJ).
 *
 * Usa {@link RestClient} (Spring 6.1+, já presente no spring-web) com timeouts
 * curtos — uma API de registro lenta não pode segurar uma thread do serviço.
 */
@Configuration
public class HttpClientConfig {

    @Bean
    public RestClient integracoesRestClient(RestClient.Builder builder) {
        var settings = ClientHttpRequestFactorySettings.DEFAULTS
                .withConnectTimeout(Duration.ofSeconds(5))
                .withReadTimeout(Duration.ofSeconds(10));
        return builder
                .requestFactory(ClientHttpRequestFactories.get(settings))
                .build();
    }
}
