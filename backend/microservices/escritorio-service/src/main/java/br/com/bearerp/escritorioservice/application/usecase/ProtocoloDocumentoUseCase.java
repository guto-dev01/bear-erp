package br.com.bearerp.escritorioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.escritorioservice.domain.model.ProtocoloDocumento;
import br.com.bearerp.escritorioservice.domain.model.ProtocoloDocumento.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProtocoloDocumentoUseCase {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public ProtocoloDocumento registrar(ProtocoloDocumento protocolo) {
        protocolo.setTenantId(TenantContext.getTenantId());
        protocolo.setEmpresaId(TenantContext.getEmpresaId());
        protocolo.setNumeroProtocolo(gerarNumeroProtocolo());
        protocolo.setStatus(StatusProtocolo.RECEBIDO);
        protocolo.setDataRecebimento(LocalDate.now());
        protocolo.setQuantidadeDocumentos(
                protocolo.getItens() != null ? protocolo.getItens().stream().mapToInt(ItemProtocolo::getQuantidade).sum() : 0);

        // Registrar movimentação inicial
        MovimentacaoProtocolo mov = MovimentacaoProtocolo.builder()
                .dataHora(Instant.now())
                .acao("RECEBIDO")
                .responsavel(TenantContext.getTenantId())
                .observacao("Protocolo registrado")
                .build();
        protocolo.setMovimentacoes(new ArrayList<>(List.of(mov)));

        // Gerar QR Code URL
        protocolo.setQrCodeUrl("/api/v1/escritorio/protocolos/" + protocolo.getNumeroProtocolo() + "/consulta");

        protocolo = mongoTemplate.save(protocolo);

        kafkaTemplate.send("bear.protocolo.registrado", protocolo.getId(), Map.of(
                "numero", protocolo.getNumeroProtocolo(),
                "empresa", protocolo.getEmpresaClienteNome() != null ? protocolo.getEmpresaClienteNome() : "",
                "tipo", protocolo.getTipo().name(),
                "documentos", protocolo.getQuantidadeDocumentos()
        ));

        return protocolo;
    }

    public ProtocoloDocumento moverParaAnalise(String id) {
        ProtocoloDocumento p = buscar(id);
        p.setStatus(StatusProtocolo.EM_ANALISE);
        adicionarMovimentacao(p, "EM_ANALISE", "Documento em análise pelo contador");
        return mongoTemplate.save(p);
    }

    public ProtocoloDocumento marcarProcessado(String id, String observacao) {
        ProtocoloDocumento p = buscar(id);
        p.setStatus(StatusProtocolo.PROCESSADO);
        adicionarMovimentacao(p, "PROCESSADO", observacao != null ? observacao : "Documento processado");
        return mongoTemplate.save(p);
    }

    public ProtocoloDocumento devolver(String id, String responsavel) {
        ProtocoloDocumento p = buscar(id);
        p.setStatus(StatusProtocolo.DEVOLVIDO);
        p.setDataDevolvido(LocalDate.now());
        adicionarMovimentacao(p, "DEVOLVIDO", "Devolvido para: " + (responsavel != null ? responsavel : "cliente"));
        return mongoTemplate.save(p);
    }

    public ProtocoloDocumento arquivar(String id) {
        ProtocoloDocumento p = buscar(id);
        p.setStatus(StatusProtocolo.ARQUIVADO);
        adicionarMovimentacao(p, "ARQUIVADO", "Documento arquivado");
        return mongoTemplate.save(p);
    }

    public ProtocoloDocumento consultarPorNumero(String numeroProtocolo) {
        return mongoTemplate.findOne(
                Query.query(Criteria.where("numeroProtocolo").is(numeroProtocolo)),
                ProtocoloDocumento.class);
    }

    public List<ProtocoloDocumento> listarPorEmpresa(String empresaClienteId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("empresaClienteId").is(empresaClienteId)),
                ProtocoloDocumento.class);
    }

    public List<ProtocoloDocumento> listarPendentes() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("status").in(StatusProtocolo.RECEBIDO, StatusProtocolo.EM_ANALISE)),
                ProtocoloDocumento.class);
    }

    public List<ProtocoloDocumento> listarAtrasados() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("prazoDevolucao").lt(LocalDate.now())
                        .and("status").nin(StatusProtocolo.DEVOLVIDO, StatusProtocolo.ARQUIVADO)),
                ProtocoloDocumento.class);
    }

    // Alerta diário de protocolos atrasados
    @Scheduled(cron = "0 0 8 * * MON-FRI")
    public void alertarProtocolosAtrasados() {
        List<ProtocoloDocumento> atrasados = mongoTemplate.find(
                Query.query(Criteria.where("prazoDevolucao").lt(LocalDate.now())
                        .and("status").nin(StatusProtocolo.DEVOLVIDO, StatusProtocolo.ARQUIVADO)),
                ProtocoloDocumento.class);

        for (ProtocoloDocumento p : atrasados) {
            long dias = ChronoUnit.DAYS.between(p.getPrazoDevolucao(), LocalDate.now());
            p.setAtrasado(true);
            p.setDiasAtraso((int) dias);
            mongoTemplate.save(p);

            kafkaTemplate.send("bear.protocolo.atrasado", p.getId(), Map.of(
                    "numero", p.getNumeroProtocolo(),
                    "empresa", p.getEmpresaClienteNome() != null ? p.getEmpresaClienteNome() : "",
                    "diasAtraso", dias,
                    "prazo", p.getPrazoDevolucao().toString()
            ));
        }

        if (!atrasados.isEmpty()) {
            log.warn("Protocolos atrasados: {} documentos pendentes de devolução", atrasados.size());
        }
    }

    public Map<String, Object> dashboard() {
        String tenantId = TenantContext.getTenantId();
        Map<String, Object> dash = new LinkedHashMap<>();

        dash.put("totalProtocolos", mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)), ProtocoloDocumento.class));
        dash.put("recebidos", mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").is(StatusProtocolo.RECEBIDO)), ProtocoloDocumento.class));
        dash.put("emAnalise", mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").is(StatusProtocolo.EM_ANALISE)), ProtocoloDocumento.class));
        dash.put("processados", mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").is(StatusProtocolo.PROCESSADO)), ProtocoloDocumento.class));
        dash.put("devolvidos", mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").is(StatusProtocolo.DEVOLVIDO)), ProtocoloDocumento.class));
        dash.put("atrasados", mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("prazoDevolucao").lt(LocalDate.now())
                        .and("status").nin(StatusProtocolo.DEVOLVIDO, StatusProtocolo.ARQUIVADO)), ProtocoloDocumento.class));

        return dash;
    }

    private ProtocoloDocumento buscar(String id) {
        ProtocoloDocumento p = mongoTemplate.findById(id, ProtocoloDocumento.class);
        if (p == null) throw new RuntimeException("Protocolo não encontrado: " + id);
        return p;
    }

    private void adicionarMovimentacao(ProtocoloDocumento p, String acao, String observacao) {
        if (p.getMovimentacoes() == null) p.setMovimentacoes(new ArrayList<>());
        p.getMovimentacoes().add(MovimentacaoProtocolo.builder()
                .dataHora(Instant.now())
                .acao(acao)
                .responsavel(TenantContext.getTenantId())
                .observacao(observacao)
                .build());
    }

    private String gerarNumeroProtocolo() {
        int ano = LocalDate.now().getYear();
        long count = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("numeroProtocolo").regex("^PROT-" + ano)),
                ProtocoloDocumento.class);
        return String.format("PROT-%d-%05d", ano, count + 1);
    }
}
