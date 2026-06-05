package br.com.bearerp.tenant.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.tenant.domain.model.PlanoAssinatura;
import br.com.bearerp.tenant.domain.model.PlanoAssinatura.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanoAssinaturaUseCase {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public PlanoAssinatura criarPlano(String tenantId, TipoPlano tipo) {
        PlanoAssinatura plano = switch (tipo) {
            case FREE -> PlanoAssinatura.criarFree(tenantId);
            case STARTER -> PlanoAssinatura.criarStarter(tenantId);
            case PRO -> PlanoAssinatura.criarPro(tenantId);
            case ENTERPRISE -> PlanoAssinatura.criarEnterprise(tenantId);
        };
        plano = mongoTemplate.save(plano);
        log.info("Plano {} criado para tenant {}", tipo, tenantId);
        return plano;
    }

    public PlanoAssinatura buscarPlanoAtivo(String tenantId) {
        return mongoTemplate.findOne(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("status").in(StatusAssinatura.ATIVA, StatusAssinatura.TRIAL)),
                PlanoAssinatura.class);
    }

    public PlanoAssinatura upgrade(String tenantId, TipoPlano novoPlano) {
        PlanoAssinatura atual = buscarPlanoAtivo(tenantId);
        if (atual != null) {
            atual.setStatus(StatusAssinatura.CANCELADA);
            mongoTemplate.save(atual);
        }
        PlanoAssinatura novo = criarPlano(tenantId, novoPlano);
        novo.setStatus(StatusAssinatura.ATIVA);
        novo.setEmTrial(false);
        novo = mongoTemplate.save(novo);

        kafkaTemplate.send("bear.assinatura.upgrade", tenantId, Map.of(
                "tenantId", tenantId,
                "planoAnterior", atual != null ? atual.getPlano().name() : "NENHUM",
                "planoNovo", novoPlano.name()
        ));
        return novo;
    }

    public boolean verificarLimiteEmpresas(String tenantId, int empresasAtuais) {
        PlanoAssinatura plano = buscarPlanoAtivo(tenantId);
        if (plano == null) return false;
        return empresasAtuais < plano.getLimiteEmpresas();
    }

    public boolean verificarModuloPermitido(String tenantId, String modulo) {
        PlanoAssinatura plano = buscarPlanoAtivo(tenantId);
        if (plano == null) return false;
        return plano.isModuloPermitido(modulo);
    }

    public void atualizarUso(String tenantId, int empresas, int usuarios, long armazenamentoMb) {
        PlanoAssinatura plano = buscarPlanoAtivo(tenantId);
        if (plano == null) return;
        plano.setEmpresasAtivas(empresas);
        plano.setUsuariosAtivos(usuarios);
        plano.setArmazenamentoUsadoMb(armazenamentoMb);
        mongoTemplate.save(plano);
    }

    public Map<String, Object> compararPlanos() {
        Map<String, Object> comparativo = new LinkedHashMap<>();
        comparativo.put("FREE", Map.of(
                "preco", "Grátis", "empresas", 5, "usuarios", 2,
                "modulos", List.of("Contábil", "Fiscal"),
                "destaque", "Ideal para começar"));
        comparativo.put("STARTER", Map.of(
                "preco", "R$ 99,90/mês", "empresas", 30, "usuarios", 5,
                "modulos", List.of("Contábil", "Fiscal", "Folha", "Patrimônio", "Financeiro", "Honorários", "Portal Cliente", "Relatórios Custom"),
                "destaque", "Para escritórios em crescimento"));
        comparativo.put("PRO", Map.of(
                "preco", "R$ 199,90/mês", "empresas", "Ilimitado", "usuarios", 20,
                "modulos", List.of("Todos + IA Contábil", "OCR", "e-CAC", "NF-e Robot", "Site Builder"),
                "destaque", "Mais popular — tecnologia completa"));
        comparativo.put("ENTERPRISE", Map.of(
                "preco", "R$ 499,90/mês", "empresas", "Ilimitado", "usuarios", "Ilimitado",
                "modulos", List.of("Todos + API Aberta", "Multi-escritório", "SLA garantido"),
                "destaque", "Para grandes escritórios e redes"));
        return comparativo;
    }

    @Scheduled(cron = "0 0 7 * * *")
    public void verificarTrialsExpirados() {
        List<PlanoAssinatura> trials = mongoTemplate.find(
                Query.query(Criteria.where("emTrial").is(true)
                        .and("fimTrial").lte(LocalDate.now())
                        .and("status").is(StatusAssinatura.TRIAL)),
                PlanoAssinatura.class);

        for (PlanoAssinatura trial : trials) {
            trial.setStatus(StatusAssinatura.EXPIRADA);
            trial.setEmTrial(false);
            mongoTemplate.save(trial);

            // Fazer downgrade automático para FREE
            criarPlano(trial.getTenantId(), TipoPlano.FREE);

            kafkaTemplate.send("bear.assinatura.trial-expirado", trial.getTenantId(), Map.of(
                    "tenantId", trial.getTenantId(),
                    "plano", trial.getPlano().name()
            ));
        }
    }
}
