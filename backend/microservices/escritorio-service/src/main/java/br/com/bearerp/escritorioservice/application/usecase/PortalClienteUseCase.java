package br.com.bearerp.escritorioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.escritorioservice.domain.model.ChecklistMensal;
import br.com.bearerp.escritorioservice.domain.model.ChecklistMensal.ItemChecklist;
import br.com.bearerp.escritorioservice.domain.model.PortalCliente;
import br.com.bearerp.escritorioservice.domain.model.PortalCliente.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortalClienteUseCase {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // === DOCUMENTOS ===

    public PortalCliente enviarDocumento(String empresaClienteId, String tipo,
                                          String competencia, String descricao, MultipartFile arquivo) {
        PortalCliente doc = PortalCliente.builder()
                .empresaClienteId(empresaClienteId)
                .tipo(tipo)
                .nomeArquivo(arquivo.getOriginalFilename())
                .descricao(descricao)
                .competencia(competencia)
                .tamanhoBytes(arquivo.getSize())
                .mimeType(arquivo.getContentType())
                .storagePath("/uploads/" + TenantContext.getTenantId() + "/" + empresaClienteId + "/" + arquivo.getOriginalFilename())
                .status(StatusDocumento.PENDENTE)
                .enviadoEm(Instant.now())
                .mensagens(new ArrayList<>())
                .build();
        doc.setTenantId(TenantContext.getTenantId());
        doc.setEmpresaId(TenantContext.getEmpresaId());

        doc = mongoTemplate.save(doc);

        kafkaTemplate.send("bear.portal.documento-enviado", doc.getId(), Map.of(
                "documentoId", doc.getId(),
                "empresa", empresaClienteId,
                "tipo", tipo,
                "arquivo", arquivo.getOriginalFilename()
        ));

        return doc;
    }

    public PortalCliente processarDocumento(String id, String observacao) {
        PortalCliente doc = buscarDocumento(id);
        doc.setStatus(StatusDocumento.PROCESSADO);
        doc.setObservacaoContador(observacao);
        doc.setProcessadoEm(Instant.now());
        doc.setProcessadoPor(TenantContext.getTenantId());
        return mongoTemplate.save(doc);
    }

    public PortalCliente devolverDocumento(String id, String motivo) {
        PortalCliente doc = buscarDocumento(id);
        doc.setStatus(StatusDocumento.DEVOLVIDO);
        doc.setObservacaoContador(motivo);
        return mongoTemplate.save(doc);
    }

    public List<PortalCliente> listarDocumentosPorEmpresa(String empresaClienteId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("empresaClienteId").is(empresaClienteId)),
                PortalCliente.class);
    }

    public List<PortalCliente> listarDocumentosPendentes() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("status").is(StatusDocumento.PENDENTE)),
                PortalCliente.class);
    }

    // === MENSAGENS ===

    public PortalCliente enviarMensagem(String documentoId, String conteudo, String autorNome) {
        PortalCliente doc = buscarDocumento(documentoId);
        if (doc.getMensagens() == null) doc.setMensagens(new ArrayList<>());

        doc.getMensagens().add(Mensagem.builder()
                .autor(TenantContext.getTenantId())
                .autorNome(autorNome)
                .conteudo(conteudo)
                .enviadaEm(Instant.now())
                .lidaPeloContador(false)
                .lidaPeloCliente(false)
                .build());

        return mongoTemplate.save(doc);
    }

    // === CHECKLIST MENSAL ===

    public ChecklistMensal gerarChecklist(String empresaClienteId, String competencia) {
        List<ItemChecklist> itens = List.of(
                ItemChecklist.builder().descricao("Notas Fiscais de Entrada").categoria("DOCUMENTOS").obrigatorio(true).build(),
                ItemChecklist.builder().descricao("Notas Fiscais de Saída").categoria("DOCUMENTOS").obrigatorio(true).build(),
                ItemChecklist.builder().descricao("Extratos Bancários").categoria("DOCUMENTOS").obrigatorio(true).build(),
                ItemChecklist.builder().descricao("Comprovantes de Pagamento").categoria("DOCUMENTOS").obrigatorio(false).build(),
                ItemChecklist.builder().descricao("Folha de Ponto").categoria("FOLHA").obrigatorio(true).build(),
                ItemChecklist.builder().descricao("Admissões/Demissões").categoria("FOLHA").obrigatorio(false).build(),
                ItemChecklist.builder().descricao("Contratos Novos").categoria("DOCUMENTOS").obrigatorio(false).build(),
                ItemChecklist.builder().descricao("Recibos de Autônomos (RPA)").categoria("FISCAL").obrigatorio(false).build()
        );

        ChecklistMensal checklist = ChecklistMensal.builder()
                .empresaClienteId(empresaClienteId)
                .competencia(competencia)
                .itens(new ArrayList<>(itens))
                .totalItens(itens.size())
                .itensCompletos(0)
                .percentualConcluido(0)
                .build();
        checklist.setTenantId(TenantContext.getTenantId());
        checklist.setEmpresaId(TenantContext.getEmpresaId());

        return mongoTemplate.save(checklist);
    }

    public ChecklistMensal marcarItemChecklist(String checklistId, int indiceItem, boolean concluido) {
        ChecklistMensal checklist = mongoTemplate.findById(checklistId, ChecklistMensal.class);
        if (checklist == null) throw new RuntimeException("Checklist não encontrado");

        checklist.getItens().get(indiceItem).setConcluido(concluido);
        long completos = checklist.getItens().stream().filter(ItemChecklist::isConcluido).count();
        checklist.setItensCompletos((int) completos);
        checklist.setPercentualConcluido((double) completos / checklist.getTotalItens() * 100);

        return mongoTemplate.save(checklist);
    }

    public List<ChecklistMensal> listarChecklists(String empresaClienteId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("empresaClienteId").is(empresaClienteId)),
                ChecklistMensal.class);
    }

    private PortalCliente buscarDocumento(String id) {
        PortalCliente doc = mongoTemplate.findById(id, PortalCliente.class);
        if (doc == null) throw new RuntimeException("Documento não encontrado: " + id);
        return doc;
    }
}
