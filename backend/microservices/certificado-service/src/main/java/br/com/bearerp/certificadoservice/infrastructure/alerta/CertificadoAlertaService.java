package br.com.bearerp.certificadoservice.infrastructure.alerta;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Certificado Digital — Melhorias:
 * - Alertas de vencimento (30, 15, 7, 1 dia)
 * - Teste de certificado (validade, cadeia, permissões)
 * - Suporte a certificado em nuvem (BirdID, NeoID)
 * - Dashboard de certificados do escritório
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CertificadoAlertaService {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TesteCertificado {
        private String certificadoId;
        private String titular;
        private String tipo;                 // A1, A3, NUVEM
        private boolean valido;
        private LocalDate validade;
        private int diasRestantes;
        private boolean cadeiaConfiavel;
        private boolean permissaoNfe;
        private boolean permissaoEsocial;
        private boolean permissaoEcac;
        private List<String> problemas;
        private String recomendacao;
    }

    /**
     * Alerta diário de certificados vencendo
     */
    @Scheduled(cron = "0 0 7 * * MON-FRI")
    public void alertarCertificadosVencendo() {
        LocalDate hoje = LocalDate.now();
        int[] diasAlerta = {30, 15, 7, 1};

        for (int dias : diasAlerta) {
            LocalDate dataLimite = hoje.plusDays(dias);

            // Em produção: buscar CertificadoDigital do certificado-service
            List<Map> certificados = mongoTemplate.find(
                    Query.query(Criteria.where("dataValidade").is(dataLimite)
                            .and("ativo").is(true)),
                    Map.class, "certificados_digitais");

            for (Map cert : certificados) {
                String certId = (String) cert.get("_id");
                String titular = (String) cert.get("titular");
                String cnpj = (String) cert.get("cnpjVinculado");

                String urgencia = dias <= 7 ? "URGENTE" : "AVISO";
                kafkaTemplate.send("bear.certificado.vencendo", certId, Map.of(
                        "certificadoId", certId,
                        "titular", titular != null ? titular : "",
                        "cnpj", cnpj != null ? cnpj : "",
                        "diasRestantes", dias,
                        "urgencia", urgencia,
                        "mensagem", String.format("Certificado digital de %s vence em %d dias (%s)",
                                titular, dias, dataLimite)
                ));

                log.warn("Certificado {} de {} vence em {} dias", certId, titular, dias);
            }
        }

        // Certificados já vencidos
        List<Map> vencidos = mongoTemplate.find(
                Query.query(Criteria.where("dataValidade").lt(hoje).and("ativo").is(true)),
                Map.class, "certificados_digitais");

        for (Map cert : vencidos) {
            kafkaTemplate.send("bear.certificado.vencido", cert.get("_id"), Map.of(
                    "certificadoId", cert.get("_id"),
                    "titular", cert.getOrDefault("titular", ""),
                    "mensagem", "CERTIFICADO VENCIDO — operações fiscais bloqueadas"
            ));
        }
    }

    /**
     * Testar certificado (validade, cadeia, permissões)
     */
    public TesteCertificado testarCertificado(String certificadoId) {
        // Em produção: carregar o certificado real e verificar
        List<String> problemas = new ArrayList<>();

        // Simular teste
        LocalDate validade = LocalDate.now().plusDays(90);
        int diasRestantes = (int) ChronoUnit.DAYS.between(LocalDate.now(), validade);

        boolean cadeiaConfiavel = true;
        boolean permissaoNfe = true;
        boolean permissaoEsocial = true;
        boolean permissaoEcac = true;

        if (diasRestantes <= 0) problemas.add("Certificado VENCIDO");
        if (diasRestantes <= 30) problemas.add("Certificado vence em " + diasRestantes + " dias");

        String recomendacao;
        if (problemas.isEmpty()) {
            recomendacao = "Certificado em perfeitas condições.";
        } else if (diasRestantes <= 0) {
            recomendacao = "RENOVAR IMEDIATAMENTE — certificado vencido impede emissão de NF-e e envio de eSocial.";
        } else {
            recomendacao = "Agendar renovação — certificado próximo do vencimento.";
        }

        return TesteCertificado.builder()
                .certificadoId(certificadoId)
                .tipo("A1")
                .valido(diasRestantes > 0)
                .validade(validade)
                .diasRestantes(diasRestantes)
                .cadeiaConfiavel(cadeiaConfiavel)
                .permissaoNfe(permissaoNfe)
                .permissaoEsocial(permissaoEsocial)
                .permissaoEcac(permissaoEcac)
                .problemas(problemas)
                .recomendacao(recomendacao)
                .build();
    }

    /**
     * Dashboard de certificados
     */
    public Map<String, Object> dashboard() {
        LocalDate hoje = LocalDate.now();
        Map<String, Object> dash = new LinkedHashMap<>();

        long total = mongoTemplate.count(Query.query(Criteria.where("ativo").is(true)), "certificados_digitais");
        long vencidos = mongoTemplate.count(
                Query.query(Criteria.where("ativo").is(true).and("dataValidade").lt(hoje)), "certificados_digitais");
        long vencendo30 = mongoTemplate.count(
                Query.query(Criteria.where("ativo").is(true)
                        .and("dataValidade").gte(hoje).lte(hoje.plusDays(30))), "certificados_digitais");
        long ok = total - vencidos - vencendo30;

        dash.put("total", total);
        dash.put("validos", ok);
        dash.put("vencendo30Dias", vencendo30);
        dash.put("vencidos", vencidos);

        // Tipos suportados
        dash.put("tiposSuportados", List.of(
                Map.of("tipo", "A1", "descricao", "Arquivo digital (PFX/P12)", "validade", "1 ano"),
                Map.of("tipo", "A3", "descricao", "Token USB ou Smart Card", "validade", "1 a 3 anos"),
                Map.of("tipo", "NUVEM", "descricao", "Certificado em nuvem (BirdID, NeoID, vidaas)", "validade", "1 a 5 anos")
        ));

        return dash;
    }
}
