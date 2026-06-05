package br.com.bearerp.fiscalservice.infrastructure.reinf;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.fiscalservice.domain.model.EventoReinf;
import br.com.bearerp.fiscalservice.domain.model.EventoReinf.*;
import br.com.bearerp.fiscalservice.domain.repository.EventoReinfRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReinfService {

    private final EventoReinfRepository repository;
    private final ReinfXmlBuilder xmlBuilder;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public EventoReinf criarEvento(EventoReinf evento) {
        evento.setTenantId(TenantContext.getTenantId());
        evento.setEmpresaId(TenantContext.getEmpresaId());
        evento.setStatus(StatusEventoReinf.RASCUNHO);
        evento.setTentativasEnvio(0);
        return repository.save(evento);
    }

    public EventoReinf validarEvento(String id) {
        EventoReinf evento = buscar(id);
        String xml = gerarXml(evento);
        evento.setXmlEnvio(xml);
        evento.setStatus(StatusEventoReinf.VALIDADO);
        return repository.save(evento);
    }

    public EventoReinf enviarEvento(String id) {
        EventoReinf evento = buscar(id);
        if (evento.getXmlEnvio() == null) {
            evento.setXmlEnvio(gerarXml(evento));
        }

        evento.setStatus(StatusEventoReinf.ENVIADO);
        evento.setDataEnvio(Instant.now());
        evento.setTentativasEnvio(evento.getTentativasEnvio() + 1);

        try {
            // Em produção: enviar via WebService SOAP da RFB
            // URL Homologação: https://preprodefdreinf.receita.fazenda.gov.br/WsREINF/RecepcaoLoteReinf.svc
            // URL Produção: https://reinf.receita.fazenda.gov.br/WsREINF/RecepcaoLoteReinf.svc

            // Simulação sandbox
            String protocolo = "REINF" + System.currentTimeMillis();
            evento.setProtocolo(protocolo);
            evento.setRecibo(protocolo + "-REC");
            evento.setCodigoRetorno("0");
            evento.setDescricaoRetorno("Evento processado com sucesso");
            evento.setStatus(StatusEventoReinf.ACEITO);
            evento.setDataRetorno(Instant.now());
            evento.setXmlRetorno("<retornoEnvioLoteEventos><status><cdRetorno>0</cdRetorno></status></retornoEnvioLoteEventos>");

            log.info("REINF evento {} enviado com sucesso - protocolo: {}", evento.getTipoEvento().getCodigo(), protocolo);

            kafkaTemplate.send("bear.fiscal.reinf-enviado", id, Map.of(
                    "eventoId", id,
                    "tipo", evento.getTipoEvento().getCodigo(),
                    "competencia", evento.getCompetencia(),
                    "protocolo", protocolo
            ));
        } catch (Exception e) {
            evento.setStatus(StatusEventoReinf.REJEITADO);
            evento.setDescricaoRetorno(e.getMessage());
            log.error("Erro ao enviar REINF: {}", e.getMessage());
        }

        return repository.save(evento);
    }

    public EventoReinf reprocessar(String id) {
        EventoReinf evento = buscar(id);
        if (evento.getStatus() != StatusEventoReinf.REJEITADO) {
            throw new RuntimeException("Apenas eventos rejeitados podem ser reprocessados");
        }
        evento.setStatus(StatusEventoReinf.VALIDADO);
        repository.save(evento);
        return enviarEvento(id);
    }

    public String gerarXml(EventoReinf evento) {
        return switch (evento.getTipoEvento()) {
            case R1000 -> xmlBuilder.buildR1000(evento);
            case R2010 -> xmlBuilder.buildR2010(evento);
            case R2020 -> xmlBuilder.buildR2020(evento);
            case R2099 -> xmlBuilder.buildR2099(evento);
            default -> throw new RuntimeException("Tipo de evento não suportado: " + evento.getTipoEvento());
        };
    }

    public EventoReinf fecharCompetencia(String competencia) {
        EventoReinf fechamento = EventoReinf.builder()
                .tipoEvento(TipoEventoReinf.R2099)
                .competencia(competencia)
                .cnpjContribuinte(TenantContext.getEmpresaId())
                .status(StatusEventoReinf.RASCUNHO)
                .build();
        fechamento.setTenantId(TenantContext.getTenantId());
        fechamento.setEmpresaId(TenantContext.getEmpresaId());
        fechamento = repository.save(fechamento);
        return enviarEvento(fechamento.getId());
    }

    public Page<EventoReinf> listar(Pageable pageable) {
        return repository.findByTenantIdAndEmpresaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), pageable);
    }

    public List<EventoReinf> listarPorCompetencia(String competencia) {
        return repository.findByTenantIdAndEmpresaIdAndCompetencia(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), competencia);
    }

    private EventoReinf buscar(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evento REINF não encontrado: " + id));
    }
}
