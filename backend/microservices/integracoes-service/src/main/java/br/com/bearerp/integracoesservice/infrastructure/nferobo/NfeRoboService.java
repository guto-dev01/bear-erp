package br.com.bearerp.integracoesservice.infrastructure.nferobo;

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
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * NF-e Robot — Busca automatizada de NF-e/NFS-e/CT-e na SEFAZ
 * Supera o "Calima BOX": polling a cada 30 min por empresa,
 * download automático de XMLs, contabilização automática, notificações.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NfeRoboService {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // === DOMAIN MODEL ===

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "nfe_robo_config")
    public static class NfeRoboConfig {
        @Id
        private String id;
        private String tenantId;
        private String empresaId;
        private String cnpjEmpresa;
        private String razaoSocial;
        private boolean ativo;
        private String certificadoId;

        // Configurações de busca
        private boolean buscarNfeEntrada;     // NF-e destinadas
        private boolean buscarNfseRecebidas;  // NFS-e tomadas
        private boolean buscarCte;            // CT-e destinados
        private boolean contabilizarAutomaticamente;
        private int intervaloMinutos;         // padrão: 30

        // Controle de execução
        private Instant ultimaExecucao;
        private Instant proximaExecucao;
        private int totalNotasBaixadas;
        private int notasHoje;
        private StatusRobo status;
        private String ultimoErro;
        private String ultimoNsu;  // Número Sequencial Único (SEFAZ)
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "nfe_robo_notas")
    public static class NotaCapturada {
        @Id
        private String id;
        private String tenantId;
        private String empresaId;
        private String configId;

        // Dados da nota
        private String chaveAcesso;        // 44 dígitos
        private TipoDocumentoFiscal tipo;  // NFE, NFSE, CTE
        private String numero;
        private String serie;
        private LocalDate dataEmissao;
        private String cnpjEmitente;
        private String razaoSocialEmitente;
        private String cnpjDestinatario;
        private BigDecimal valorTotal;
        private BigDecimal valorIcms;
        private BigDecimal valorPis;
        private BigDecimal valorCofins;
        private BigDecimal valorIss;
        private String cfop;
        private String naturezaOperacao;

        // XML e processamento
        private String xmlCompleto;
        private String nsu;
        private Instant capturadaEm;
        private StatusNotaCapturada status;
        private boolean contabilizada;
        private String lancamentoContabilId;
        private boolean manifestada;        // Manifesto do destinatário
        private TipoManifestacao manifestacao;
        private String observacoes;
    }

    public enum StatusRobo {
        ATIVO, PAUSADO, EXECUTANDO, ERRO, DESATIVADO
    }

    public enum TipoDocumentoFiscal {
        NFE, NFSE, CTE, NFCE
    }

    public enum StatusNotaCapturada {
        CAPTURADA, VALIDADA, CONTABILIZADA, REJEITADA, DUPLICADA, ERRO
    }

    public enum TipoManifestacao {
        CIENCIA_OPERACAO,        // 210210
        CONFIRMACAO_OPERACAO,    // 210200
        DESCONHECIMENTO,         // 210220
        OPERACAO_NAO_REALIZADA   // 210240
    }

    // === CONFIGURAÇÃO ===

    public NfeRoboConfig configurar(String cnpjEmpresa, String certificadoId, Map<String, Object> opcoes) {
        // Verificar se já existe config para esta empresa
        NfeRoboConfig existing = mongoTemplate.findOne(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("cnpjEmpresa").is(cnpjEmpresa)),
                NfeRoboConfig.class);

        NfeRoboConfig config = existing != null ? existing : new NfeRoboConfig();
        config.setTenantId(TenantContext.getTenantId());
        config.setEmpresaId(TenantContext.getEmpresaId());
        config.setCnpjEmpresa(cnpjEmpresa);
        config.setCertificadoId(certificadoId);
        config.setAtivo(true);
        config.setStatus(StatusRobo.ATIVO);

        config.setBuscarNfeEntrada(getBool(opcoes, "buscarNfeEntrada", true));
        config.setBuscarNfseRecebidas(getBool(opcoes, "buscarNfseRecebidas", true));
        config.setBuscarCte(getBool(opcoes, "buscarCte", false));
        config.setContabilizarAutomaticamente(getBool(opcoes, "contabilizarAutomaticamente", true));
        config.setIntervaloMinutos(getInt(opcoes, "intervaloMinutos", 30));

        config.setProximaExecucao(Instant.now());
        config = mongoTemplate.save(config);

        log.info("NF-e Robot configurado para CNPJ {} - intervalo: {}min", cnpjEmpresa, config.getIntervaloMinutos());
        return config;
    }

    public NfeRoboConfig pausar(String configId) {
        NfeRoboConfig config = mongoTemplate.findById(configId, NfeRoboConfig.class);
        if (config == null) throw new RuntimeException("Configuração não encontrada");
        config.setStatus(StatusRobo.PAUSADO);
        config.setAtivo(false);
        return mongoTemplate.save(config);
    }

    public NfeRoboConfig reativar(String configId) {
        NfeRoboConfig config = mongoTemplate.findById(configId, NfeRoboConfig.class);
        if (config == null) throw new RuntimeException("Configuração não encontrada");
        config.setStatus(StatusRobo.ATIVO);
        config.setAtivo(true);
        config.setProximaExecucao(Instant.now());
        return mongoTemplate.save(config);
    }

    // === EXECUÇÃO AUTOMÁTICA A CADA 30 MINUTOS ===

    @Scheduled(fixedRate = 1800000) // 30 minutos em milissegundos
    public void executarBuscaAutomatica() {
        List<NfeRoboConfig> configs = mongoTemplate.find(
                Query.query(Criteria.where("ativo").is(true)
                        .and("status").is(StatusRobo.ATIVO)
                        .and("proximaExecucao").lte(Instant.now())),
                NfeRoboConfig.class);

        log.info("NF-e Robot: {} empresas para buscar notas", configs.size());

        for (NfeRoboConfig config : configs) {
            try {
                executarBusca(config);
            } catch (Exception e) {
                config.setStatus(StatusRobo.ERRO);
                config.setUltimoErro(e.getMessage());
                mongoTemplate.save(config);
                log.error("Erro no NF-e Robot para CNPJ {}: {}", config.getCnpjEmpresa(), e.getMessage());
            }
        }
    }

    public Map<String, Object> executarBuscaManual(String configId) {
        NfeRoboConfig config = mongoTemplate.findById(configId, NfeRoboConfig.class);
        if (config == null) throw new RuntimeException("Configuração não encontrada");
        return executarBusca(config);
    }

    private Map<String, Object> executarBusca(NfeRoboConfig config) {
        config.setStatus(StatusRobo.EXECUTANDO);
        mongoTemplate.save(config);

        int notasCapturadas = 0;
        List<NotaCapturada> novas = new ArrayList<>();

        try {
            // 1. Buscar NF-e destinadas via DistribuiçãoDFe (SEFAZ)
            if (config.isBuscarNfeEntrada()) {
                List<NotaCapturada> nfes = buscarNfeSefaz(config);
                novas.addAll(nfes);
                notasCapturadas += nfes.size();
            }

            // 2. Buscar NFS-e recebidas (prefeituras)
            if (config.isBuscarNfseRecebidas()) {
                List<NotaCapturada> nfses = buscarNfsePrefeituras(config);
                novas.addAll(nfses);
                notasCapturadas += nfses.size();
            }

            // 3. Buscar CT-e destinados
            if (config.isBuscarCte()) {
                List<NotaCapturada> ctes = buscarCteSefaz(config);
                novas.addAll(ctes);
                notasCapturadas += ctes.size();
            }

            // 4. Contabilizar automaticamente se configurado
            if (config.isContabilizarAutomaticamente()) {
                for (NotaCapturada nota : novas) {
                    contabilizarNota(nota, config);
                }
            }

            // Atualizar config
            config.setStatus(StatusRobo.ATIVO);
            config.setUltimaExecucao(Instant.now());
            config.setProximaExecucao(Instant.now().plusSeconds(config.getIntervaloMinutos() * 60L));
            config.setTotalNotasBaixadas(config.getTotalNotasBaixadas() + notasCapturadas);
            config.setNotasHoje(contarNotasHoje(config));
            config.setUltimoErro(null);
            mongoTemplate.save(config);

            // Notificar se houver novas notas
            if (notasCapturadas > 0) {
                kafkaTemplate.send("bear.nfe-robo.notas-capturadas", config.getId(), Map.of(
                        "configId", config.getId(),
                        "cnpj", config.getCnpjEmpresa(),
                        "quantidade", notasCapturadas,
                        "contabilizadas", config.isContabilizarAutomaticamente()
                ));
            }

            log.info("NF-e Robot CNPJ {}: {} notas capturadas", config.getCnpjEmpresa(), notasCapturadas);

        } catch (Exception e) {
            config.setStatus(StatusRobo.ERRO);
            config.setUltimoErro(e.getMessage());
            mongoTemplate.save(config);
            throw e;
        }

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("cnpj", config.getCnpjEmpresa());
        resultado.put("notasCapturadas", notasCapturadas);
        resultado.put("nfe", novas.stream().filter(n -> n.getTipo() == TipoDocumentoFiscal.NFE).count());
        resultado.put("nfse", novas.stream().filter(n -> n.getTipo() == TipoDocumentoFiscal.NFSE).count());
        resultado.put("cte", novas.stream().filter(n -> n.getTipo() == TipoDocumentoFiscal.CTE).count());
        resultado.put("contabilizadas", config.isContabilizarAutomaticamente() ? notasCapturadas : 0);
        resultado.put("executadoEm", Instant.now().toString());
        return resultado;
    }

    // === BUSCA NA SEFAZ (DistribuiçãoDFe) ===

    private List<NotaCapturada> buscarNfeSefaz(NfeRoboConfig config) {
        // Em produção: Chamar webservice NFeDistribuicaoDFe
        // URL: https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx
        // Envelope SOAP com distDFeInt (consulta por NSU ou por chave)
        // Usar certificado digital A1 para autenticação mTLS

        List<NotaCapturada> notas = new ArrayList<>();

        // Simulação: Em produção, parsear o retorno XML da SEFAZ
        // O retorno contém lotes de DF-e com resNFe (resumo) ou procNFe (completo)
        // Verificar duplicidade antes de salvar
        String ultimoNsu = config.getUltimoNsu() != null ? config.getUltimoNsu() : "0";

        // Simulação de notas encontradas
        NotaCapturada nota = criarNotaSimulada(config, TipoDocumentoFiscal.NFE);
        if (nota != null && !isDuplicada(nota.getChaveAcesso())) {
            nota = mongoTemplate.save(nota);
            notas.add(nota);
        }

        return notas;
    }

    private List<NotaCapturada> buscarNfsePrefeituras(NfeRoboConfig config) {
        // Em produção: Consultar NFS-e tomadas via webservice das prefeituras
        // Usar os providers já existentes (GINFES, Betha, ISSNet)
        // ConsultarNfseFaixa ou ConsultarNfseServicoPrestado
        return new ArrayList<>();
    }

    private List<NotaCapturada> buscarCteSefaz(NfeRoboConfig config) {
        // Em produção: Chamar webservice CTeDistribuicaoDFe
        // Similar ao NFeDistribuicaoDFe mas para CT-e
        return new ArrayList<>();
    }

    // === MANIFESTO DO DESTINATÁRIO ===

    public NotaCapturada manifestar(String notaId, TipoManifestacao tipo) {
        NotaCapturada nota = mongoTemplate.findById(notaId, NotaCapturada.class);
        if (nota == null) throw new RuntimeException("Nota não encontrada");

        // Em produção: Enviar evento de manifestação para SEFAZ
        // Webservice: RecepcaoEvento
        // Tipo: 210210 (Ciência), 210200 (Confirmação), 210220 (Desconhecimento), 210240 (Não realizada)

        nota.setManifestada(true);
        nota.setManifestacao(tipo);

        if (tipo == TipoManifestacao.DESCONHECIMENTO || tipo == TipoManifestacao.OPERACAO_NAO_REALIZADA) {
            nota.setStatus(StatusNotaCapturada.REJEITADA);
        }

        nota = mongoTemplate.save(nota);

        kafkaTemplate.send("bear.nfe-robo.manifesto", nota.getId(), Map.of(
                "chaveAcesso", nota.getChaveAcesso(),
                "tipo", tipo.name(),
                "cnpjEmitente", nota.getCnpjEmitente()
        ));

        return nota;
    }

    // === CONTABILIZAÇÃO AUTOMÁTICA ===

    private void contabilizarNota(NotaCapturada nota, NfeRoboConfig config) {
        try {
            // Enviar para contabilização via Kafka
            Map<String, Object> dadosLancamento = new LinkedHashMap<>();
            dadosLancamento.put("tenantId", config.getTenantId());
            dadosLancamento.put("empresaId", config.getEmpresaId());
            dadosLancamento.put("tipo", nota.getTipo().name());
            dadosLancamento.put("chaveAcesso", nota.getChaveAcesso());
            dadosLancamento.put("cnpjEmitente", nota.getCnpjEmitente());
            dadosLancamento.put("valorTotal", nota.getValorTotal().toString());
            dadosLancamento.put("valorIcms", nota.getValorIcms() != null ? nota.getValorIcms().toString() : "0");
            dadosLancamento.put("valorPis", nota.getValorPis() != null ? nota.getValorPis().toString() : "0");
            dadosLancamento.put("valorCofins", nota.getValorCofins() != null ? nota.getValorCofins().toString() : "0");
            dadosLancamento.put("cfop", nota.getCfop());
            dadosLancamento.put("dataEmissao", nota.getDataEmissao().toString());
            dadosLancamento.put("numero", nota.getNumero());
            dadosLancamento.put("naturezaOperacao", nota.getNaturezaOperacao());

            kafkaTemplate.send("bear.nfe-robo.contabilizar", nota.getId(), dadosLancamento);

            nota.setContabilizada(true);
            nota.setStatus(StatusNotaCapturada.CONTABILIZADA);
            mongoTemplate.save(nota);

        } catch (Exception e) {
            nota.setStatus(StatusNotaCapturada.ERRO);
            nota.setObservacoes("Erro ao contabilizar: " + e.getMessage());
            mongoTemplate.save(nota);
        }
    }

    // === CONSULTAS ===

    public List<NfeRoboConfig> listarConfiguracoes() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())),
                NfeRoboConfig.class);
    }

    public List<NotaCapturada> listarNotas(String configId, String dataInicio, String dataFim) {
        Criteria criteria = Criteria.where("configId").is(configId);
        if (dataInicio != null && dataFim != null) {
            criteria.and("dataEmissao").gte(LocalDate.parse(dataInicio)).lte(LocalDate.parse(dataFim));
        }
        return mongoTemplate.find(Query.query(criteria), NotaCapturada.class);
    }

    public List<NotaCapturada> listarPendentes(String configId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("configId").is(configId)
                        .and("status").is(StatusNotaCapturada.CAPTURADA)
                        .and("contabilizada").is(false)),
                NotaCapturada.class);
    }

    public Map<String, Object> dashboard() {
        String tenantId = TenantContext.getTenantId();
        LocalDate hoje = LocalDate.now();

        List<NfeRoboConfig> configs = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(tenantId)), NfeRoboConfig.class);

        long empresasAtivas = configs.stream().filter(NfeRoboConfig::isAtivo).count();
        long empresasComErro = configs.stream().filter(c -> c.getStatus() == StatusRobo.ERRO).count();
        int totalHoje = configs.stream().mapToInt(NfeRoboConfig::getNotasHoje).sum();
        int totalGeral = configs.stream().mapToInt(NfeRoboConfig::getTotalNotasBaixadas).sum();

        long pendentesContabilizacao = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("contabilizada").is(false)
                        .and("status").is(StatusNotaCapturada.CAPTURADA)),
                NotaCapturada.class);

        long pendentesManifestacao = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("manifestada").is(false)
                        .and("tipo").is(TipoDocumentoFiscal.NFE)),
                NotaCapturada.class);

        Map<String, Object> dash = new LinkedHashMap<>();
        dash.put("empresasMonitoradas", configs.size());
        dash.put("empresasAtivas", empresasAtivas);
        dash.put("empresasComErro", empresasComErro);
        dash.put("notasHoje", totalHoje);
        dash.put("totalNotasBaixadas", totalGeral);
        dash.put("pendentesContabilizacao", pendentesContabilizacao);
        dash.put("pendentesManifestacao", pendentesManifestacao);
        return dash;
    }

    // === HELPERS ===

    private boolean isDuplicada(String chaveAcesso) {
        return mongoTemplate.exists(
                Query.query(Criteria.where("chaveAcesso").is(chaveAcesso)),
                NotaCapturada.class);
    }

    private int contarNotasHoje(NfeRoboConfig config) {
        LocalDate hoje = LocalDate.now();
        return (int) mongoTemplate.count(
                Query.query(Criteria.where("configId").is(config.getId())
                        .and("dataEmissao").is(hoje)),
                NotaCapturada.class);
    }

    private NotaCapturada criarNotaSimulada(NfeRoboConfig config, TipoDocumentoFiscal tipo) {
        // Simulação para demonstração — em produção, parsear XML real da SEFAZ
        return NotaCapturada.builder()
                .tenantId(config.getTenantId())
                .empresaId(config.getEmpresaId())
                .configId(config.getId())
                .chaveAcesso(gerarChaveSimulada())
                .tipo(tipo)
                .numero(String.valueOf(new Random().nextInt(99999) + 1))
                .serie("1")
                .dataEmissao(LocalDate.now())
                .cnpjEmitente("11222333000181")
                .razaoSocialEmitente("FORNECEDOR EXEMPLO LTDA")
                .cnpjDestinatario(config.getCnpjEmpresa())
                .valorTotal(new BigDecimal("1500.00"))
                .valorIcms(new BigDecimal("270.00"))
                .valorPis(new BigDecimal("24.75"))
                .valorCofins(new BigDecimal("114.00"))
                .cfop("1102")
                .naturezaOperacao("COMPRA PARA COMERCIALIZACAO")
                .capturadaEm(Instant.now())
                .status(StatusNotaCapturada.CAPTURADA)
                .contabilizada(false)
                .manifestada(false)
                .build();
    }

    private String gerarChaveSimulada() {
        StringBuilder sb = new StringBuilder();
        Random r = new Random();
        for (int i = 0; i < 44; i++) sb.append(r.nextInt(10));
        return sb.toString();
    }

    private boolean getBool(Map<String, Object> map, String key, boolean defaultVal) {
        if (map == null || !map.containsKey(key)) return defaultVal;
        return Boolean.parseBoolean(map.get(key).toString());
    }

    private int getInt(Map<String, Object> map, String key, int defaultVal) {
        if (map == null || !map.containsKey(key)) return defaultVal;
        return Integer.parseInt(map.get(key).toString());
    }
}
