package br.com.bearerp.integracoesservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.integracoesservice.domain.model.Integracao;
import br.com.bearerp.integracoesservice.domain.model.Integracao.StatusIntegracao;
import br.com.bearerp.integracoesservice.domain.model.LogIntegracao;
import br.com.bearerp.integracoesservice.domain.repository.IntegracaoRepository;
import br.com.bearerp.integracoesservice.domain.repository.LogIntegracaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class IntegracaoUseCase {
    private final IntegracaoRepository integracaoRepository;
    private final LogIntegracaoRepository logRepository;

    public Integracao criar(String nome, String descricao, Integracao.TipoIntegracao tipo,
                            Map<String, String> configuracao, boolean sincAutomatica, String cronExpression) {
        Integracao integracao = Integracao.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .nome(nome).descricao(descricao).tipo(tipo)
                .status(StatusIntegracao.CONFIGURANDO)
                .configuracao(configuracao)
                .sincronizacaoAutomatica(sincAutomatica).cronExpression(cronExpression)
                .totalSincronizacoes(0).totalErros(0)
                .build();
        return integracaoRepository.save(integracao);
    }

    public List<Integracao> listar() {
        return integracaoRepository.findByTenantIdAndEmpresaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId());
    }

    public Integracao ativar(String id) {
        Integracao integracao = buscarPorId(id);
        integracao.setStatus(StatusIntegracao.ATIVA);
        return integracaoRepository.save(integracao);
    }

    public Integracao desativar(String id) {
        Integracao integracao = buscarPorId(id);
        integracao.setStatus(StatusIntegracao.INATIVA);
        return integracaoRepository.save(integracao);
    }

    public LogIntegracao sincronizar(String id) {
        Integracao integracao = buscarPorId(id);
        long inicio = System.currentTimeMillis();

        LogIntegracao log = LogIntegracao.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .integracaoId(id).direcao(LogIntegracao.DirecaoLog.SINCRONIZACAO)
                .dataExecucao(Instant.now())
                .build();

        try {
            // Simulação de sincronização
            log.setStatus(LogIntegracao.StatusLog.SUCESSO);
            log.setRegistrosProcessados(15);
            log.setRegistrosComErro(0);
            log.setMensagem("Sincronização realizada com sucesso");

            integracao.setUltimaSincronizacao(Instant.now());
            integracao.setTotalSincronizacoes(integracao.getTotalSincronizacoes() + 1);
            integracao.setStatus(StatusIntegracao.ATIVA);
        } catch (Exception e) {
            log.setStatus(LogIntegracao.StatusLog.FALHA);
            log.setDetalhesErro(e.getMessage());
            integracao.setUltimoErro(e.getMessage());
            integracao.setTotalErros(integracao.getTotalErros() + 1);
            integracao.setStatus(StatusIntegracao.ERRO);
        }

        log.setTempoExecucaoMs(System.currentTimeMillis() - inicio);
        integracaoRepository.save(integracao);
        return logRepository.save(log);
    }

    public Page<LogIntegracao> listarLogs(String integracaoId, Pageable pageable) {
        return logRepository.findByIntegracaoId(integracaoId, pageable);
    }

    public Integracao buscarPorId(String id) {
        return integracaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Integração não encontrada"));
    }

    public void excluir(String id) {
        integracaoRepository.deleteById(id);
    }
}
