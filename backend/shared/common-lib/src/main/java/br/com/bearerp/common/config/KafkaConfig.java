package br.com.bearerp.common.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Bean public NewTopic userCreatedTopic() { return TopicBuilder.name("bear.auth.user-created").partitions(6).replicas(1).build(); }
    @Bean public NewTopic userLoggedInTopic() { return TopicBuilder.name("bear.auth.user-logged-in").partitions(6).replicas(1).build(); }
    @Bean public NewTopic tenantCreatedTopic() { return TopicBuilder.name("bear.tenant.created").partitions(3).replicas(1).build(); }
    @Bean public NewTopic empresaCreatedTopic() { return TopicBuilder.name("bear.empresa.created").partitions(6).replicas(1).build(); }
    @Bean public NewTopic empresaUpdatedTopic() { return TopicBuilder.name("bear.empresa.updated").partitions(6).replicas(1).build(); }
    @Bean public NewTopic lancamentoCreatedTopic() { return TopicBuilder.name("bear.contabil.lancamento-created").partitions(12).replicas(1).build(); }
    @Bean public NewTopic lancamentoApprovedTopic() { return TopicBuilder.name("bear.contabil.lancamento-approved").partitions(6).replicas(1).build(); }
    @Bean public NewTopic nfeEmittedTopic() { return TopicBuilder.name("bear.fiscal.nfe-emitted").partitions(12).replicas(1).build(); }
    @Bean public NewTopic nfeCancelledTopic() { return TopicBuilder.name("bear.fiscal.nfe-cancelled").partitions(6).replicas(1).build(); }
    @Bean public NewTopic nfseEmittedTopic() { return TopicBuilder.name("bear.fiscal.nfse-emitted").partitions(12).replicas(1).build(); }
    @Bean public NewTopic contaPagarCreatedTopic() { return TopicBuilder.name("bear.financeiro.conta-pagar-created").partitions(6).replicas(1).build(); }
    @Bean public NewTopic contaReceberCreatedTopic() { return TopicBuilder.name("bear.financeiro.conta-receber-created").partitions(6).replicas(1).build(); }
    @Bean public NewTopic pagamentoConfirmedTopic() { return TopicBuilder.name("bear.financeiro.pagamento-confirmed").partitions(6).replicas(1).build(); }
    @Bean public NewTopic holeriteGeneratedTopic() { return TopicBuilder.name("bear.folha.holerite-generated").partitions(6).replicas(1).build(); }
    @Bean public NewTopic apuracaoCompletedTopic() { return TopicBuilder.name("bear.tributario.apuracao-completed").partitions(6).replicas(1).build(); }
    @Bean public NewTopic classificacaoCompletedTopic() { return TopicBuilder.name("bear.ai.classificacao-completed").partitions(6).replicas(1).build(); }
    @Bean public NewTopic spedGeneratedTopic() { return TopicBuilder.name("bear.obrigacoes.sped-generated").partitions(3).replicas(1).build(); }
}
