package br.com.bearerp.integracoesservice.infrastructure.ecac;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.integracoesservice.domain.model.ConsultaEcac;
import br.com.bearerp.integracoesservice.domain.model.ConsultaEcac.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class EcacService {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Agendar consulta ao e-CAC
     */
    public ConsultaEcac agendarConsulta(String cnpjEmpresa, String certificadoId,
                                         TipoConsultaEcac tipo, String periodoReferencia) {
        ConsultaEcac consulta = ConsultaEcac.builder()
                .cnpjEmpresa(cnpjEmpresa)
                .certificadoId(certificadoId)
                .tipo(tipo)
                .periodoReferencia(periodoReferencia)
                .status(StatusConsultaEcac.AGENDADA)
                .debitos(new ArrayList<>())
                .declaracoesPendentes(new ArrayList<>())
                .declaracoesEntregues(new ArrayList<>())
                .parcelamentos(new ArrayList<>())
                .pendenciasMalha(new ArrayList<>())
                .mensagens(new ArrayList<>())
                .build();
        consulta.setTenantId(TenantContext.getTenantId());
        consulta.setEmpresaId(TenantContext.getEmpresaId());

        consulta = mongoTemplate.save(consulta);

        // Disparar consulta assíncrona
        executarConsultaAsync(consulta.getId());

        return consulta;
    }

    /**
     * Execução assíncrona da consulta ao e-CAC
     */
    @Async
    public void executarConsultaAsync(String consultaId) {
        ConsultaEcac consulta = mongoTemplate.findById(consultaId, ConsultaEcac.class);
        if (consulta == null) return;

        try {
            // Etapa 1: Autenticação com certificado digital
            consulta.setStatus(StatusConsultaEcac.AUTENTICANDO);
            mongoTemplate.save(consulta);

            boolean autenticado = autenticarCertificado(consulta.getCertificadoId());
            if (!autenticado) {
                consulta.setStatus(StatusConsultaEcac.ERRO_CERTIFICADO);
                consulta.setObservacoes("Falha na autenticação do certificado digital. Verifique validade e permissões.");
                mongoTemplate.save(consulta);
                return;
            }

            // Etapa 2: Executar consultas conforme tipo solicitado
            consulta.setStatus(StatusConsultaEcac.CONSULTANDO);
            mongoTemplate.save(consulta);

            if (consulta.getTipo() == TipoConsultaEcac.COMPLETA || consulta.getTipo() == TipoConsultaEcac.SITUACAO_FISCAL) {
                consultarSituacaoFiscal(consulta);
            }
            if (consulta.getTipo() == TipoConsultaEcac.COMPLETA || consulta.getTipo() == TipoConsultaEcac.DEBITOS_PENDENCIAS) {
                consultarDebitos(consulta);
            }
            if (consulta.getTipo() == TipoConsultaEcac.COMPLETA || consulta.getTipo() == TipoConsultaEcac.DECLARACOES) {
                consultarDeclaracoes(consulta);
            }
            if (consulta.getTipo() == TipoConsultaEcac.COMPLETA || consulta.getTipo() == TipoConsultaEcac.PARCELAMENTOS) {
                consultarParcelamentos(consulta);
            }
            if (consulta.getTipo() == TipoConsultaEcac.COMPLETA || consulta.getTipo() == TipoConsultaEcac.MALHA_FISCAL) {
                consultarMalhaFiscal(consulta);
            }
            if (consulta.getTipo() == TipoConsultaEcac.COMPLETA || consulta.getTipo() == TipoConsultaEcac.CERTIDOES) {
                consultarCertidoes(consulta);
            }
            if (consulta.getTipo() == TipoConsultaEcac.COMPLETA || consulta.getTipo() == TipoConsultaEcac.CAIXA_POSTAL) {
                consultarCaixaPostal(consulta);
            }

            // Etapa 3: Finalizar
            consulta.setStatus(StatusConsultaEcac.CONCLUIDA);
            consulta.setConsultadoEm(Instant.now());
            consulta.setProximaConsulta(Instant.now().plus(24, ChronoUnit.HOURS));
            mongoTemplate.save(consulta);

            // Emitir eventos para alertas
            emitirAlertas(consulta);

            log.info("Consulta e-CAC concluída: CNPJ {} - tipo: {} - débitos: {} - pendências: {}",
                    consulta.getCnpjEmpresa(), consulta.getTipo(),
                    consulta.getQuantidadeDebitos(),
                    consulta.getDeclaracoesPendentes() != null ? consulta.getDeclaracoesPendentes().size() : 0);

        } catch (Exception e) {
            consulta.setStatus(StatusConsultaEcac.ERRO_CONEXAO);
            consulta.setObservacoes("Erro na consulta: " + e.getMessage());
            mongoTemplate.save(consulta);
            log.error("Erro na consulta e-CAC para CNPJ {}: {}", consulta.getCnpjEmpresa(), e.getMessage());
        }
    }

    /**
     * Consulta automática diária às 6h para todas as empresas com certificado configurado
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void consultaAutomaticaDiaria() {
        log.info("Iniciando consulta automática diária ao e-CAC...");

        List<ConsultaEcac> ultimasConsultas = mongoTemplate.find(
                Query.query(Criteria.where("status").is(StatusConsultaEcac.CONCLUIDA)
                        .and("proximaConsulta").lte(Instant.now())),
                ConsultaEcac.class);

        Set<String> cnpjsConsultados = new HashSet<>();
        for (ConsultaEcac ultima : ultimasConsultas) {
            if (cnpjsConsultados.add(ultima.getCnpjEmpresa())) {
                agendarConsulta(ultima.getCnpjEmpresa(), ultima.getCertificadoId(),
                        TipoConsultaEcac.COMPLETA, ultima.getPeriodoReferencia());
            }
        }

        log.info("Consulta automática agendada para {} empresas", cnpjsConsultados.size());
    }

    /**
     * Buscar última consulta de uma empresa
     */
    public ConsultaEcac buscarUltimaConsulta(String cnpjEmpresa) {
        List<ConsultaEcac> consultas = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("cnpjEmpresa").is(cnpjEmpresa)
                        .and("status").is(StatusConsultaEcac.CONCLUIDA))
                        .limit(1)
                        .with(org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "consultadoEm")),
                ConsultaEcac.class);
        return consultas.isEmpty() ? null : consultas.get(0);
    }

    /**
     * Listar consultas por empresa
     */
    public List<ConsultaEcac> listarConsultas(String cnpjEmpresa) {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("cnpjEmpresa").is(cnpjEmpresa))
                        .with(org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "consultadoEm")),
                ConsultaEcac.class);
    }

    /**
     * Listar todas as empresas com pendências
     */
    public List<ConsultaEcac> listarEmpresasComPendencias() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("status").is(StatusConsultaEcac.CONCLUIDA)
                        .andOperator(
                                new Criteria().orOperator(
                                        Criteria.where("situacaoFiscal.possuiDebitos").is(true),
                                        Criteria.where("situacaoFiscal.possuiPendencias").is(true),
                                        Criteria.where("situacaoFiscal.possuiMalhaFiscal").is(true),
                                        Criteria.where("quantidadeDebitos").gt(0)
                                )
                        )),
                ConsultaEcac.class);
    }

    /**
     * Dashboard resumo e-CAC
     */
    public Map<String, Object> dashboard() {
        String tenantId = TenantContext.getTenantId();

        long empresasRegulares = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("status").is(StatusConsultaEcac.CONCLUIDA)
                        .and("situacaoFiscal.situacao").is("REGULAR")),
                ConsultaEcac.class);

        long empresasIrregulares = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("status").is(StatusConsultaEcac.CONCLUIDA)
                        .and("situacaoFiscal.situacao").ne("REGULAR")),
                ConsultaEcac.class);

        long certidoesVencendo = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("certidaoFederal.dataValidade").lte(LocalDate.now().plusDays(30))),
                ConsultaEcac.class);

        long mensagensNaoLidas = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("mensagensNaoLidas").gt(0)),
                ConsultaEcac.class).stream()
                .mapToLong(ConsultaEcac::getMensagensNaoLidas)
                .sum();

        long consultasComErro = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("status").in(StatusConsultaEcac.ERRO_AUTENTICACAO,
                                StatusConsultaEcac.ERRO_CERTIFICADO,
                                StatusConsultaEcac.ERRO_CONEXAO,
                                StatusConsultaEcac.ERRO_TIMEOUT)),
                ConsultaEcac.class);

        Map<String, Object> dash = new LinkedHashMap<>();
        dash.put("empresasRegulares", empresasRegulares);
        dash.put("empresasIrregulares", empresasIrregulares);
        dash.put("certidoesVencendo30Dias", certidoesVencendo);
        dash.put("mensagensNaoLidas", mensagensNaoLidas);
        dash.put("consultasComErro", consultasComErro);

        return dash;
    }

    // === MÉTODOS PRIVADOS ===

    private boolean autenticarCertificado(String certificadoId) {
        // Em produção: carregar certificado A1/A3 do certificado-service,
        // estabelecer conexão HTTPS mTLS com e-CAC da RFB
        // URL: https://cav.receita.fazenda.gov.br/autenticacao/login
        log.info("Autenticando certificado {} no e-CAC...", certificadoId);
        return certificadoId != null && !certificadoId.isEmpty();
    }

    private void consultarSituacaoFiscal(ConsultaEcac consulta) {
        // Em produção: navegar no e-CAC e extrair dados da situação fiscal
        // Simulação com dados realistas
        SituacaoFiscal situacao = SituacaoFiscal.builder()
                .situacao("REGULAR")
                .dataConsulta(LocalDate.now())
                .possuiDebitos(false)
                .possuiPendencias(false)
                .possuiMalhaFiscal(false)
                .regimeTributario("LUCRO_PRESUMIDO")
                .build();
        consulta.setSituacaoFiscal(situacao);
    }

    private void consultarDebitos(ConsultaEcac consulta) {
        // Em produção: consultar SIDA/Conta Corrente da RFB
        // Simulação vazia (empresa regular)
        consulta.setDebitos(new ArrayList<>());
        consulta.setTotalDebitos(BigDecimal.ZERO);
        consulta.setQuantidadeDebitos(0);
    }

    private void consultarDeclaracoes(ConsultaEcac consulta) {
        // Em produção: consultar Situação das Declarações no e-CAC
        int anoAtual = LocalDate.now().getYear();

        List<DeclaracaoEntregue> entregues = List.of(
                DeclaracaoEntregue.builder()
                        .tipoDeclaracao("DCTF")
                        .periodoReferencia((anoAtual - 1) + "-12")
                        .dataEntrega(LocalDate.of(anoAtual, 2, 15))
                        .situacao("ACEITA")
                        .build(),
                DeclaracaoEntregue.builder()
                        .tipoDeclaracao("ECD")
                        .periodoReferencia(String.valueOf(anoAtual - 1))
                        .dataEntrega(LocalDate.of(anoAtual, 5, 30))
                        .situacao("ACEITA")
                        .build()
        );
        consulta.setDeclaracoesEntregues(new ArrayList<>(entregues));
        consulta.setDeclaracoesPendentes(new ArrayList<>());
    }

    private void consultarParcelamentos(ConsultaEcac consulta) {
        consulta.setParcelamentos(new ArrayList<>());
    }

    private void consultarMalhaFiscal(ConsultaEcac consulta) {
        consulta.setPendenciasMalha(new ArrayList<>());
    }

    private void consultarCertidoes(ConsultaEcac consulta) {
        // Em produção: consultar emissão de CND/CPEND
        LocalDate hoje = LocalDate.now();

        consulta.setCertidaoFederal(CertidaoNegativa.builder()
                .tipo("CND")
                .descricaoTipo("Certidão Negativa de Débitos")
                .dataEmissao(hoje.minusDays(30))
                .dataValidade(hoje.plusDays(150))
                .valida(true)
                .build());

        consulta.setCertidaoPrevidenciaria(CertidaoNegativa.builder()
                .tipo("CND")
                .descricaoTipo("Certidão Negativa de Débitos Previdenciários")
                .dataEmissao(hoje.minusDays(15))
                .dataValidade(hoje.plusDays(165))
                .valida(true)
                .build());

        consulta.setCertidaoFgts(CertidaoNegativa.builder()
                .tipo("CRF")
                .descricaoTipo("Certificado de Regularidade do FGTS")
                .dataEmissao(hoje.minusDays(10))
                .dataValidade(hoje.plusDays(20))
                .valida(true)
                .build());
    }

    private void consultarCaixaPostal(ConsultaEcac consulta) {
        // Em produção: consultar Caixa Postal do e-CAC
        consulta.setMensagens(new ArrayList<>());
        consulta.setMensagensNaoLidas(0);
    }

    private void emitirAlertas(ConsultaEcac consulta) {
        Map<String, Object> evento = new LinkedHashMap<>();
        evento.put("consultaId", consulta.getId());
        evento.put("cnpj", consulta.getCnpjEmpresa());
        evento.put("situacao", consulta.getSituacaoFiscal() != null ? consulta.getSituacaoFiscal().getSituacao() : "DESCONHECIDA");
        evento.put("debitos", consulta.getQuantidadeDebitos());
        evento.put("pendencias", consulta.getDeclaracoesPendentes() != null ? consulta.getDeclaracoesPendentes().size() : 0);

        kafkaTemplate.send("bear.ecac.consulta-concluida", consulta.getId(), evento);

        // Alertas críticos
        if (consulta.getSituacaoFiscal() != null && !"REGULAR".equals(consulta.getSituacaoFiscal().getSituacao())) {
            kafkaTemplate.send("bear.ecac.alerta-irregularidade", consulta.getId(), Map.of(
                    "cnpj", consulta.getCnpjEmpresa(),
                    "situacao", consulta.getSituacaoFiscal().getSituacao(),
                    "motivo", consulta.getSituacaoFiscal().getMotivoIrregularidade() != null
                            ? consulta.getSituacaoFiscal().getMotivoIrregularidade() : ""
            ));
        }

        // Certidões vencendo
        if (consulta.getCertidaoFederal() != null && consulta.getCertidaoFederal().getDataValidade() != null
                && consulta.getCertidaoFederal().getDataValidade().isBefore(LocalDate.now().plusDays(30))) {
            kafkaTemplate.send("bear.ecac.alerta-certidao-vencendo", consulta.getId(), Map.of(
                    "cnpj", consulta.getCnpjEmpresa(),
                    "tipo", "FEDERAL",
                    "validade", consulta.getCertidaoFederal().getDataValidade().toString()
            ));
        }

        // Mensagens urgentes
        if (consulta.getMensagens() != null) {
            consulta.getMensagens().stream()
                    .filter(MensagemEcac::isUrgente)
                    .filter(m -> !m.isLida())
                    .forEach(msg -> kafkaTemplate.send("bear.ecac.mensagem-urgente", consulta.getId(), Map.of(
                            "cnpj", consulta.getCnpjEmpresa(),
                            "assunto", msg.getAssunto(),
                            "tipo", msg.getTipoMensagem()
                    )));
        }
    }
}
