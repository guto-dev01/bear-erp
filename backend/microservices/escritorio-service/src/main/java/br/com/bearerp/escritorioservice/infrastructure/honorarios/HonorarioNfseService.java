package br.com.bearerp.escritorioservice.infrastructure.honorarios;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Honorários Avançados — supera concorrentes:
 * - NFS-e automática ao faturar honorário
 * - Contrato digital com assinatura eletrônica
 * - Reajuste automático por índice (IPCA, IGP-M)
 * - Relatório de lucratividade por cliente
 * - Integração com régua de cobrança
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HonorarioNfseService {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "honorarios_nfse")
    public static class HonorarioFaturamento {
        @Id
        private String id;
        private String tenantId;
        private String clienteId;
        private String clienteNome;
        private String clienteCnpj;
        private String competencia;
        private BigDecimal valorHonorario;
        private BigDecimal valorAdicional;
        private String descricaoAdicional;
        private BigDecimal valorTotal;
        private BigDecimal valorIss;
        private BigDecimal aliquotaIss;
        private StatusFaturamento status;
        private String nfseNumero;
        private String nfseProtocolo;
        private LocalDate dataEmissaoNfse;
        private String contratoId;
        private Instant criadoEm;
        private Instant faturadoEm;
    }

    public enum StatusFaturamento {
        PENDENTE, FATURADO, NFSE_EMITIDA, NFSE_ERRO, CANCELADO
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "contratos_honorarios")
    public static class ContratoHonorario {
        @Id
        private String id;
        private String tenantId;
        private String clienteId;
        private String clienteNome;
        private String clienteCnpj;
        private BigDecimal valorMensal;
        private String indiceReajuste;       // IPCA, IGPM, INPC
        private int mesReajuste;             // Mês do reajuste anual
        private LocalDate dataInicio;
        private LocalDate dataFim;
        private boolean ativo;
        private String descricaoServicos;
        private List<String> servicosInclusos;

        // Assinatura digital
        private String hashDocumento;
        private boolean assinadoContratante;
        private boolean assinadoContratado;
        private Instant assinadoEm;
        private String tokenAssinatura;

        private Instant criadoEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LucratividadeCliente {
        private String clienteId;
        private String clienteNome;
        private BigDecimal receitaMensal;
        private BigDecimal receitaAnual;
        private int horasTrabalhadasMes;
        private BigDecimal custoEstimadoMes;
        private BigDecimal lucroMes;
        private BigDecimal margemLucro;       // percentual
        private String classificacao;         // LUCRATIVO, EQUILIBRIO, DEFICITARIO
    }

    // === FATURAMENTO COM NFS-e AUTOMÁTICA ===

    @Scheduled(cron = "0 0 8 1 * *") // Dia 1 de cada mês
    public void faturarHonorariosMensal() {
        String competencia = LocalDate.now().minusMonths(1).toString().substring(0, 7);
        List<ContratoHonorario> contratos = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("ativo").is(true)),
                ContratoHonorario.class);

        for (ContratoHonorario contrato : contratos) {
            try {
                HonorarioFaturamento fat = faturarHonorario(contrato, competencia);
                emitirNfseHonorario(fat);
                log.info("Honorário faturado: cliente {} competência {} valor {}",
                        contrato.getClienteNome(), competencia, contrato.getValorMensal());
            } catch (Exception e) {
                log.error("Erro ao faturar honorário cliente {}: {}",
                        contrato.getClienteNome(), e.getMessage());
            }
        }
    }

    public HonorarioFaturamento faturarHonorario(ContratoHonorario contrato, String competencia) {
        BigDecimal aliquotaIss = new BigDecimal("0.05"); // 5% padrão
        BigDecimal valorIss = contrato.getValorMensal().multiply(aliquotaIss)
                .setScale(2, RoundingMode.HALF_UP);

        HonorarioFaturamento fat = HonorarioFaturamento.builder()
                .tenantId(contrato.getTenantId())
                .clienteId(contrato.getClienteId())
                .clienteNome(contrato.getClienteNome())
                .clienteCnpj(contrato.getClienteCnpj())
                .competencia(competencia)
                .valorHonorario(contrato.getValorMensal())
                .valorTotal(contrato.getValorMensal())
                .valorIss(valorIss)
                .aliquotaIss(aliquotaIss)
                .status(StatusFaturamento.FATURADO)
                .contratoId(contrato.getId())
                .criadoEm(Instant.now())
                .faturadoEm(Instant.now())
                .build();

        return mongoTemplate.save(fat);
    }

    public void emitirNfseHonorario(HonorarioFaturamento faturamento) {
        kafkaTemplate.send("bear.honorario.emitir-nfse", faturamento.getId(), Map.of(
                "faturamentoId", faturamento.getId(),
                "clienteCnpj", faturamento.getClienteCnpj() != null ? faturamento.getClienteCnpj() : "",
                "clienteNome", faturamento.getClienteNome() != null ? faturamento.getClienteNome() : "",
                "valorServico", faturamento.getValorTotal().toString(),
                "aliquotaIss", faturamento.getAliquotaIss().toString(),
                "descricao", "Serviços contábeis referente " + faturamento.getCompetencia(),
                "competencia", faturamento.getCompetencia()
        ));
        faturamento.setStatus(StatusFaturamento.NFSE_EMITIDA);
        mongoTemplate.save(faturamento);
    }

    // === CONTRATO DIGITAL ===

    public ContratoHonorario criarContrato(ContratoHonorario contrato) {
        contrato.setTenantId(TenantContext.getTenantId());
        contrato.setAtivo(true);
        contrato.setCriadoEm(Instant.now());
        contrato.setTokenAssinatura(UUID.randomUUID().toString());
        contrato.setHashDocumento(gerarHashContrato(contrato));
        return mongoTemplate.save(contrato);
    }

    public ContratoHonorario assinarContrato(String contratoId, String tipoAssinante) {
        ContratoHonorario contrato = mongoTemplate.findById(contratoId, ContratoHonorario.class);
        if (contrato == null) throw new RuntimeException("Contrato não encontrado");

        if ("CONTRATANTE".equals(tipoAssinante)) {
            contrato.setAssinadoContratante(true);
        } else if ("CONTRATADO".equals(tipoAssinante)) {
            contrato.setAssinadoContratado(true);
        }

        if (contrato.isAssinadoContratante() && contrato.isAssinadoContratado()) {
            contrato.setAssinadoEm(Instant.now());
            kafkaTemplate.send("bear.honorario.contrato-assinado", contratoId, Map.of(
                    "contratoId", contratoId,
                    "clienteNome", contrato.getClienteNome(),
                    "valorMensal", contrato.getValorMensal().toString()
            ));
        }

        return mongoTemplate.save(contrato);
    }

    // === REAJUSTE AUTOMÁTICO ===

    @Scheduled(cron = "0 0 7 1 * *") // Dia 1 de cada mês
    public void verificarReajustes() {
        int mesAtual = LocalDate.now().getMonthValue();
        List<ContratoHonorario> contratos = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("ativo").is(true)
                        .and("mesReajuste").is(mesAtual)),
                ContratoHonorario.class);

        for (ContratoHonorario contrato : contratos) {
            BigDecimal indice = obterIndice(contrato.getIndiceReajuste());
            BigDecimal novoValor = contrato.getValorMensal()
                    .multiply(BigDecimal.ONE.add(indice))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal valorAnterior = contrato.getValorMensal();
            contrato.setValorMensal(novoValor);
            mongoTemplate.save(contrato);

            kafkaTemplate.send("bear.honorario.reajuste", contrato.getId(), Map.of(
                    "contratoId", contrato.getId(),
                    "clienteNome", contrato.getClienteNome(),
                    "valorAnterior", valorAnterior.toString(),
                    "novoValor", novoValor.toString(),
                    "indice", contrato.getIndiceReajuste(),
                    "percentual", indice.multiply(new BigDecimal("100")).toString() + "%"
            ));

            log.info("Reajuste honorário {}: {} -> {} ({})",
                    contrato.getClienteNome(), valorAnterior, novoValor, contrato.getIndiceReajuste());
        }
    }

    // === LUCRATIVIDADE POR CLIENTE ===

    public List<LucratividadeCliente> relatorioLucratividade() {
        List<ContratoHonorario> contratos = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("ativo").is(true)),
                ContratoHonorario.class);

        List<LucratividadeCliente> resultado = new ArrayList<>();
        for (ContratoHonorario contrato : contratos) {
            // Estimar custo baseado em número de serviços
            int numServicos = contrato.getServicosInclusos() != null ? contrato.getServicosInclusos().size() : 1;
            BigDecimal custoEstimado = new BigDecimal("150").multiply(BigDecimal.valueOf(numServicos));

            BigDecimal lucro = contrato.getValorMensal().subtract(custoEstimado);
            BigDecimal margem = contrato.getValorMensal().compareTo(BigDecimal.ZERO) > 0
                    ? lucro.divide(contrato.getValorMensal(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    : BigDecimal.ZERO;

            String classificacao;
            if (margem.compareTo(new BigDecimal("20")) >= 0) classificacao = "LUCRATIVO";
            else if (margem.compareTo(BigDecimal.ZERO) >= 0) classificacao = "EQUILIBRIO";
            else classificacao = "DEFICITARIO";

            resultado.add(LucratividadeCliente.builder()
                    .clienteId(contrato.getClienteId())
                    .clienteNome(contrato.getClienteNome())
                    .receitaMensal(contrato.getValorMensal())
                    .receitaAnual(contrato.getValorMensal().multiply(BigDecimal.valueOf(12)))
                    .custoEstimadoMes(custoEstimado)
                    .lucroMes(lucro)
                    .margemLucro(margem)
                    .classificacao(classificacao)
                    .build());
        }

        resultado.sort(Comparator.comparing(LucratividadeCliente::getMargemLucro).reversed());
        return resultado;
    }

    // === DASHBOARD ===

    public Map<String, Object> dashboardHonorarios() {
        String tenantId = TenantContext.getTenantId();
        Map<String, Object> dash = new LinkedHashMap<>();

        long totalContratos = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("ativo").is(true)),
                ContratoHonorario.class);

        List<ContratoHonorario> contratos = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(tenantId).and("ativo").is(true)),
                ContratoHonorario.class);

        BigDecimal receitaMensal = contratos.stream()
                .map(ContratoHonorario::getValorMensal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        dash.put("totalContratos", totalContratos);
        dash.put("receitaMensalTotal", receitaMensal);
        dash.put("receitaAnualEstimada", receitaMensal.multiply(BigDecimal.valueOf(12)));
        dash.put("ticketMedio", totalContratos > 0
                ? receitaMensal.divide(BigDecimal.valueOf(totalContratos), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);

        // Lucratividade
        List<LucratividadeCliente> lucr = relatorioLucratividade();
        long lucrativos = lucr.stream().filter(l -> "LUCRATIVO".equals(l.getClassificacao())).count();
        long equilibrio = lucr.stream().filter(l -> "EQUILIBRIO".equals(l.getClassificacao())).count();
        long deficitarios = lucr.stream().filter(l -> "DEFICITARIO".equals(l.getClassificacao())).count();

        dash.put("clientesLucrativos", lucrativos);
        dash.put("clientesEquilibrio", equilibrio);
        dash.put("clientesDeficitarios", deficitarios);

        return dash;
    }

    private BigDecimal obterIndice(String indice) {
        // Em produção: integrar com API do IBGE/BCB
        return switch (indice != null ? indice : "") {
            case "IPCA" -> new BigDecimal("0.0446");   // Simulação ~4.46%
            case "IGPM" -> new BigDecimal("0.0394");   // Simulação ~3.94%
            case "INPC" -> new BigDecimal("0.0462");   // Simulação ~4.62%
            default -> new BigDecimal("0.05");
        };
    }

    private String gerarHashContrato(ContratoHonorario contrato) {
        String dados = contrato.getClienteId() + contrato.getValorMensal() + contrato.getDataInicio();
        return UUID.nameUUIDFromBytes(dados.getBytes()).toString();
    }
}
