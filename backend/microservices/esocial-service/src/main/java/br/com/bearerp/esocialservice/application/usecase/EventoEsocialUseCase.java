package br.com.bearerp.esocialservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.esocialservice.domain.model.EventoEsocial;
import br.com.bearerp.esocialservice.domain.repository.EventoEsocialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service @RequiredArgsConstructor
public class EventoEsocialUseCase {
    private final EventoEsocialRepository repository;

    public Page<EventoEsocial> listar(EventoEsocial.TipoEvento tipo, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        if (tipo != null) {
            return repository.findByTenantIdAndEmpresaIdAndTipoEvento(tenantId, empresaId, tipo, pageable);
        }
        return repository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable);
    }

    public EventoEsocial criar(EventoEsocial.TipoEvento tipoEvento, String funcionarioId,
                                String funcionarioCpf, String funcionarioNome,
                                String competencia, String observacao) {
        EventoEsocial.GrupoEvento grupo = determinarGrupo(tipoEvento);

        EventoEsocial evento = EventoEsocial.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .tipoEvento(tipoEvento).grupo(grupo)
                .funcionarioId(funcionarioId).funcionarioCpf(funcionarioCpf).funcionarioNome(funcionarioNome)
                .competencia(competencia)
                .status(EventoEsocial.StatusEvento.RASCUNHO)
                .observacao(observacao)
                .build();

        return repository.save(evento);
    }

    public EventoEsocial validar(String id) {
        EventoEsocial evento = buscar(id);
        // Simulação: gera XML do evento
        evento.setXmlEnvio(gerarXmlEvento(evento));
        evento.setStatus(EventoEsocial.StatusEvento.VALIDADO);
        return repository.save(evento);
    }

    public EventoEsocial enviar(String id) {
        EventoEsocial evento = buscar(id);
        if (evento.getStatus() != EventoEsocial.StatusEvento.VALIDADO) {
            throw new RuntimeException("Evento deve estar validado para envio");
        }
        // Simulação de envio ao eSocial
        evento.setStatus(EventoEsocial.StatusEvento.ENVIADO);
        evento.setDataEnvio(LocalDateTime.now());
        evento.setProtocoloEnvio("PROT-" + System.currentTimeMillis());

        // Simulação de retorno (em produção seria assíncrono)
        evento.setStatus(EventoEsocial.StatusEvento.ACEITO);
        evento.setDataRetorno(LocalDateTime.now());
        evento.setReciboEntrega("REC-" + System.currentTimeMillis());
        evento.setXmlRetorno("<retornoEvento><status>ACEITO</status></retornoEvento>");

        return repository.save(evento);
    }

    public List<EventoEsocial> listarPendentes() {
        return repository.findByTenantIdAndEmpresaIdAndStatus(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), EventoEsocial.StatusEvento.RASCUNHO);
    }

    public List<EventoEsocial> listarPorCompetencia(String competencia) {
        return repository.findByTenantIdAndEmpresaIdAndCompetencia(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), competencia);
    }

    public List<EventoEsocial> listarPorFuncionario(String funcionarioId) {
        return repository.findByTenantIdAndEmpresaIdAndFuncionarioId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), funcionarioId);
    }

    private EventoEsocial buscar(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evento eSocial não encontrado"));
    }

    private EventoEsocial.GrupoEvento determinarGrupo(EventoEsocial.TipoEvento tipo) {
        String nome = tipo.name();
        if (nome.startsWith("S1") && !nome.startsWith("S12")) return EventoEsocial.GrupoEvento.TABELAS;
        if (nome.startsWith("S2")) return EventoEsocial.GrupoEvento.NAO_PERIODICOS;
        return EventoEsocial.GrupoEvento.PERIODICOS;
    }

    private String gerarXmlEvento(EventoEsocial evento) {
        return String.format("""
                <?xml version="1.0" encoding="UTF-8"?>
                <eSocial xmlns="http://www.esocial.gov.br/schema/evt/%s/v_S_01_02_00">
                    <evtInfoEmpregador>
                        <ideEvento>
                            <tpAmb>2</tpAmb>
                            <procEmi>1</procEmi>
                            <verProc>BEAR-ERP-1.0</verProc>
                        </ideEvento>
                    </evtInfoEmpregador>
                </eSocial>
                """, evento.getTipoEvento().name().toLowerCase());
    }
}
