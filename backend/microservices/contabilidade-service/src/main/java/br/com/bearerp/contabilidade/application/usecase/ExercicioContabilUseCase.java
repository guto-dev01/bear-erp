package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.contabilidade.application.dto.ExercicioContabilResponse;
import br.com.bearerp.contabilidade.domain.model.*;
import br.com.bearerp.contabilidade.domain.model.ExercicioContabil.StatusExercicio;
import br.com.bearerp.contabilidade.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExercicioContabilUseCase {

    private final ExercicioContabilRepository exercicioRepository;
    private final PeriodoContabilRepository periodoRepository;
    private final SaldoContaRepository saldoContaRepository;
    private final PlanoContasRepository planoContasRepository;

    public ExercicioContabilResponse criarExercicio(int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (exercicioRepository.findByTenantIdAndEmpresaIdAndAno(tenantId, empresaId, ano).isPresent()) {
            throw new BusinessException("EXERCICIO_EXISTS", "Exercício " + ano + " já existe");
        }

        ExercicioContabil exercicio = ExercicioContabil.builder()
                .ano(ano)
                .dataInicio(LocalDate.of(ano, 1, 1))
                .dataFim(LocalDate.of(ano, 12, 31))
                .status(StatusExercicio.ABERTO)
                .saldoInicialGerado(false)
                .build();
        exercicio.setTenantId(tenantId);
        exercicio.setEmpresaId(empresaId);
        exercicio = exercicioRepository.save(exercicio);

        // Criar 12 períodos
        for (int mes = 1; mes <= 12; mes++) {
            LocalDate inicio = LocalDate.of(ano, mes, 1);
            PeriodoContabil periodo = PeriodoContabil.builder()
                    .ano(ano)
                    .mes(mes)
                    .dataInicio(inicio)
                    .dataFim(inicio.withDayOfMonth(inicio.lengthOfMonth()))
                    .status(PeriodoContabil.StatusPeriodo.ABERTO)
                    .build();
            periodo.setTenantId(tenantId);
            periodo.setEmpresaId(empresaId);
            periodoRepository.save(periodo);
        }

        log.info("Exercício {} criado com 12 períodos (tenant: {})", ano, tenantId);
        return toResponse(exercicio);
    }

    public ExercicioContabilResponse encerrarExercicio(int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        ExercicioContabil exercicio = exercicioRepository.findByTenantIdAndEmpresaIdAndAno(tenantId, empresaId, ano)
                .orElseThrow(() -> new BusinessException("EXERCICIO_NAO_ENCONTRADO", "Exercício não encontrado"));

        if (exercicio.getStatus() == StatusExercicio.ENCERRADO) {
            throw new BusinessException("EXERCICIO_JA_ENCERRADO", "Exercício já está encerrado");
        }

        // Calcular resultado: Receitas - Custos - Despesas
        List<SaldoConta> saldosDezembro = saldoContaRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, 12);

        BigDecimal resultado = BigDecimal.ZERO;
        for (SaldoConta saldo : saldosDezembro) {
            if (saldo.getClassificacao() == PlanoContas.Classificacao.RECEITA) {
                resultado = resultado.add(saldo.getSaldoAtual());
            } else if (saldo.getClassificacao() == PlanoContas.Classificacao.CUSTO || saldo.getClassificacao() == PlanoContas.Classificacao.DESPESA) {
                resultado = resultado.subtract(saldo.getSaldoAtual().abs());
            }
        }

        exercicio.setStatus(StatusExercicio.ENCERRADO);
        exercicio.setDataEncerramento(Instant.now());
        exercicio.setLucroOuPrejuizo(resultado);
        exercicio = exercicioRepository.save(exercicio);

        // Fechar todos os períodos
        List<PeriodoContabil> periodos = periodoRepository.findByTenantIdAndEmpresaIdAndAno(tenantId, empresaId, ano);
        for (PeriodoContabil p : periodos) {
            if (p.getStatus() != PeriodoContabil.StatusPeriodo.FECHADO) {
                p.setStatus(PeriodoContabil.StatusPeriodo.FECHADO);
                p.setDataFechamento(Instant.now());
                periodoRepository.save(p);
            }
        }

        log.info("Exercício {} encerrado - resultado: {} (tenant: {})", ano, resultado, tenantId);
        return toResponse(exercicio);
    }

    public ExercicioContabilResponse gerarSaldosIniciais(int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        ExercicioContabil exercicio = exercicioRepository.findByTenantIdAndEmpresaIdAndAno(tenantId, empresaId, ano)
                .orElseThrow(() -> new BusinessException("EXERCICIO_NAO_ENCONTRADO", "Exercício não encontrado"));

        int anoAnterior = ano - 1;
        List<SaldoConta> saldosAnoAnterior = saldoContaRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, anoAnterior, 12);

        for (SaldoConta saldoAnterior : saldosAnoAnterior) {
            // Só transporta contas patrimoniais (Ativo, Passivo, PL)
            if (saldoAnterior.getClassificacao() == PlanoContas.Classificacao.ATIVO
                    || saldoAnterior.getClassificacao() == PlanoContas.Classificacao.PASSIVO
                    || saldoAnterior.getClassificacao() == PlanoContas.Classificacao.PATRIMONIO_LIQUIDO) {

                SaldoConta saldoInicial = SaldoConta.builder()
                        .contaId(saldoAnterior.getContaId())
                        .contaCodigo(saldoAnterior.getContaCodigo())
                        .contaDescricao(saldoAnterior.getContaDescricao())
                        .natureza(saldoAnterior.getNatureza())
                        .classificacao(saldoAnterior.getClassificacao())
                        .nivel(saldoAnterior.getNivel())
                        .ano(ano)
                        .mes(1)
                        .saldoAnterior(saldoAnterior.getSaldoAtual())
                        .totalDebitos(BigDecimal.ZERO)
                        .totalCreditos(BigDecimal.ZERO)
                        .saldoAtual(saldoAnterior.getSaldoAtual())
                        .build();
                saldoInicial.setTenantId(tenantId);
                saldoInicial.setEmpresaId(empresaId);
                saldoContaRepository.save(saldoInicial);
            }
        }

        exercicio.setSaldoInicialGerado(true);
        exercicioRepository.save(exercicio);

        log.info("Saldos iniciais gerados para {} (tenant: {})", ano, tenantId);
        return toResponse(exercicio);
    }

    private ExercicioContabilResponse toResponse(ExercicioContabil e) {
        return ExercicioContabilResponse.builder()
                .id(e.getId())
                .ano(e.getAno())
                .dataInicio(e.getDataInicio())
                .dataFim(e.getDataFim())
                .status(e.getStatus().name())
                .dataEncerramento(e.getDataEncerramento())
                .saldoInicialGerado(e.isSaldoInicialGerado())
                .lucroOuPrejuizo(e.getLucroOuPrejuizo())
                .build();
    }
}
