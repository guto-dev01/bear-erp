package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.contabilidade.application.dto.*;
import br.com.bearerp.contabilidade.domain.model.*;
import br.com.bearerp.contabilidade.domain.model.LancamentoContabil.*;
import br.com.bearerp.contabilidade.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LancamentoContabilUseCase {

    private final LancamentoContabilRepository lancamentoRepository;
    private final PlanoContasRepository planoContasRepository;
    private final CentroCustoRepository centroCustoRepository;
    private final PeriodoContabilRepository periodoRepository;
    private final SaldoContaRepository saldoContaRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public LancamentoResponse createLancamento(CreateLancamentoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        LocalDate competencia = request.getDataCompetencia() != null ? request.getDataCompetencia() : request.getDataLancamento();

        // Validar período aberto
        periodoRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, competencia.getYear(), competencia.getMonthValue())
                .ifPresent(p -> {
                    if (p.getStatus() == PeriodoContabil.StatusPeriodo.FECHADO) {
                        throw new BusinessException("PERIODO_FECHADO", "Período " + competencia.getMonthValue() + "/" + competencia.getYear() + " está fechado");
                    }
                });

        // Validar partidas
        BigDecimal totalDebito = BigDecimal.ZERO;
        BigDecimal totalCredito = BigDecimal.ZERO;
        boolean temDebito = false, temCredito = false;

        List<Partida> partidas = new ArrayList<>();
        for (CreateLancamentoRequest.PartidaRequest pr : request.getPartidas()) {
            PlanoContas conta = planoContasRepository.findById(pr.getContaId())
                    .orElseThrow(() -> new BusinessException("CONTA_NAO_ENCONTRADA", "Conta não encontrada: " + pr.getContaId()));

            if (!conta.isAceitaLancamento()) {
                throw new BusinessException("CONTA_SINTETICA", "Conta " + conta.getCodigo() + " é sintética e não aceita lançamentos");
            }

            TipoPartida tipoPartida = TipoPartida.valueOf(pr.getTipo());
            if (tipoPartida == TipoPartida.DEBITO) {
                totalDebito = totalDebito.add(pr.getValor());
                temDebito = true;
            } else {
                totalCredito = totalCredito.add(pr.getValor());
                temCredito = true;
            }

            String centroCustoNome = null;
            if (pr.getCentroCustoId() != null) {
                CentroCusto cc = centroCustoRepository.findById(pr.getCentroCustoId())
                        .orElseThrow(() -> new BusinessException("CC_NAO_ENCONTRADO", "Centro de custo não encontrado"));
                centroCustoNome = cc.getDescricao();
            }

            partidas.add(Partida.builder()
                    .contaId(conta.getId())
                    .contaCodigo(conta.getCodigo())
                    .contaDescricao(conta.getDescricao())
                    .tipo(tipoPartida)
                    .valor(pr.getValor())
                    .historicoPartida(pr.getHistoricoPartida())
                    .centroCustoId(pr.getCentroCustoId())
                    .centroCustoNome(centroCustoNome)
                    .build());
        }

        if (!temDebito || !temCredito) {
            throw new BusinessException("PARTIDA_INCOMPLETA", "Lançamento deve ter ao menos um débito e um crédito");
        }

        if (totalDebito.compareTo(totalCredito) != 0) {
            throw new BusinessException("PARTIDA_DESBALANCEADA",
                    "Débitos (" + totalDebito + ") e créditos (" + totalCredito + ") devem ser iguais");
        }

        // Gerar número sequencial
        Long numero = lancamentoRepository.findTopByTenantIdAndEmpresaIdOrderByNumeroDesc(tenantId, empresaId)
                .map(l -> l.getNumero() + 1)
                .orElse(1L);

        TipoLancamento tipo = request.getTipo() != null ? TipoLancamento.valueOf(request.getTipo()) : TipoLancamento.NORMAL;

        LancamentoContabil lancamento = LancamentoContabil.builder()
                .numero(numero)
                .dataLancamento(request.getDataLancamento())
                .dataCompetencia(competencia)
                .tipo(tipo)
                .origemTipo(OrigemTipo.MANUAL)
                .historicoPadrao(request.getHistoricoPadrao())
                .historicoComplementar(request.getHistoricoComplementar())
                .partidas(partidas)
                .valorTotal(totalDebito)
                .status(StatusLancamento.CONFIRMADO)
                .loteId(request.getLoteId())
                .build();
        lancamento.setTenantId(tenantId);
        lancamento.setEmpresaId(empresaId);

        lancamento = lancamentoRepository.save(lancamento);

        // Atualizar saldos
        updateSaldos(lancamento);

        // Publicar evento
        try {
            kafkaTemplate.send("bear.contabilidade.lancamento-criado", lancamento.getId(), lancamento);
        } catch (Exception e) {
            log.warn("Falha ao publicar evento Kafka: {}", e.getMessage());
        }

        log.info("Lançamento #{} criado - valor: {} (tenant: {})", numero, totalDebito, tenantId);
        return toResponse(lancamento);
    }

    public LancamentoResponse getLancamento(String id) {
        return toResponse(lancamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lançamento", id)));
    }

    public Page<LancamentoResponse> listLancamentos(Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return lancamentoRepository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable).map(this::toResponse);
    }

    public List<LancamentoResponse> listByPeriodo(LocalDate inicio, LocalDate fim) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return lancamentoRepository.findByTenantIdAndEmpresaIdAndDataLancamentoBetween(tenantId, empresaId, inicio, fim)
                .stream().map(this::toResponse).toList();
    }

    public List<LancamentoResponse> listByCompetencia(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        LocalDate inicio = LocalDate.of(ano, mes, 1);
        LocalDate fim = inicio.withDayOfMonth(inicio.lengthOfMonth());
        return lancamentoRepository.findByTenantIdAndEmpresaIdAndDataCompetenciaBetween(tenantId, empresaId, inicio, fim)
                .stream().map(this::toResponse).toList();
    }

    public List<LancamentoResponse> listByConta(String contaId, LocalDate inicio, LocalDate fim) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return lancamentoRepository.findByContaAndPeriodo(tenantId, empresaId, contaId, inicio, fim)
                .stream().map(this::toResponse).toList();
    }

    public LancamentoResponse estornarLancamento(String id, EstornarLancamentoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        LancamentoContabil original = lancamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lançamento", id));

        if (original.getStatus() == StatusLancamento.ESTORNADO) {
            throw new BusinessException("JA_ESTORNADO", "Lançamento já foi estornado");
        }

        // Inverter partidas (débito vira crédito e vice-versa)
        List<Partida> partidasEstorno = original.getPartidas().stream()
                .map(p -> Partida.builder()
                        .contaId(p.getContaId())
                        .contaCodigo(p.getContaCodigo())
                        .contaDescricao(p.getContaDescricao())
                        .tipo(p.getTipo() == TipoPartida.DEBITO ? TipoPartida.CREDITO : TipoPartida.DEBITO)
                        .valor(p.getValor())
                        .historicoPartida("ESTORNO: " + request.getMotivo())
                        .centroCustoId(p.getCentroCustoId())
                        .centroCustoNome(p.getCentroCustoNome())
                        .build())
                .toList();

        Long numero = lancamentoRepository.findTopByTenantIdAndEmpresaIdOrderByNumeroDesc(tenantId, empresaId)
                .map(l -> l.getNumero() + 1).orElse(1L);

        LocalDate dataEstorno = request.getDataEstorno() != null ? request.getDataEstorno() : LocalDate.now();

        LancamentoContabil estorno = LancamentoContabil.builder()
                .numero(numero)
                .dataLancamento(dataEstorno)
                .dataCompetencia(original.getDataCompetencia())
                .tipo(TipoLancamento.AJUSTE)
                .origemTipo(OrigemTipo.MANUAL)
                .historicoPadrao("ESTORNO DO LANÇAMENTO #" + original.getNumero())
                .historicoComplementar(request.getMotivo())
                .partidas(partidasEstorno)
                .valorTotal(original.getValorTotal())
                .status(StatusLancamento.CONFIRMADO)
                .estornoDeId(original.getId())
                .build();
        estorno.setTenantId(tenantId);
        estorno.setEmpresaId(empresaId);

        estorno = lancamentoRepository.save(estorno);

        // Marcar original como estornado
        original.setStatus(StatusLancamento.ESTORNADO);
        lancamentoRepository.save(original);

        // Atualizar saldos com o estorno
        updateSaldos(estorno);

        log.info("Lançamento #{} estornado pelo lançamento #{}", original.getNumero(), estorno.getNumero());
        return toResponse(estorno);
    }

    private void updateSaldos(LancamentoContabil lancamento) {
        String tenantId = lancamento.getTenantId();
        String empresaId = lancamento.getEmpresaId();
        int ano = lancamento.getDataCompetencia().getYear();
        int mes = lancamento.getDataCompetencia().getMonthValue();

        for (Partida partida : lancamento.getPartidas()) {
            SaldoConta saldo = saldoContaRepository
                    .findByTenantIdAndEmpresaIdAndContaIdAndAnoAndMes(tenantId, empresaId, partida.getContaId(), ano, mes)
                    .orElseGet(() -> {
                        PlanoContas conta = planoContasRepository.findById(partida.getContaId()).orElse(null);
                        SaldoConta novo = SaldoConta.builder()
                                .contaId(partida.getContaId())
                                .contaCodigo(partida.getContaCodigo())
                                .contaDescricao(partida.getContaDescricao())
                                .natureza(conta != null ? conta.getNatureza() : null)
                                .classificacao(conta != null ? conta.getClassificacao() : null)
                                .nivel(conta != null ? conta.getNivel() : 0)
                                .ano(ano)
                                .mes(mes)
                                .saldoAnterior(BigDecimal.ZERO)
                                .totalDebitos(BigDecimal.ZERO)
                                .totalCreditos(BigDecimal.ZERO)
                                .saldoAtual(BigDecimal.ZERO)
                                .centroCustoId(partida.getCentroCustoId())
                                .build();
                        novo.setTenantId(tenantId);
                        novo.setEmpresaId(empresaId);

                        // Buscar saldo anterior
                        int mesAnt = mes == 1 ? 12 : mes - 1;
                        int anoAnt = mes == 1 ? ano - 1 : ano;
                        saldoContaRepository.findByTenantIdAndEmpresaIdAndContaIdAndAnoAndMes(tenantId, empresaId, partida.getContaId(), anoAnt, mesAnt)
                                .ifPresent(sa -> novo.setSaldoAnterior(sa.getSaldoAtual()));

                        return novo;
                    });

            if (partida.getTipo() == TipoPartida.DEBITO) {
                saldo.setTotalDebitos(saldo.getTotalDebitos().add(partida.getValor()));
            } else {
                saldo.setTotalCreditos(saldo.getTotalCreditos().add(partida.getValor()));
            }

            // Calcular saldo atual baseado na natureza da conta
            BigDecimal movimento = saldo.getTotalDebitos().subtract(saldo.getTotalCreditos());
            if (saldo.getNatureza() == PlanoContas.Natureza.DEVEDORA) {
                saldo.setSaldoAtual(saldo.getSaldoAnterior().add(movimento));
            } else {
                saldo.setSaldoAtual(saldo.getSaldoAnterior().subtract(movimento));
            }

            saldoContaRepository.save(saldo);
        }
    }

    private LancamentoResponse toResponse(LancamentoContabil l) {
        return LancamentoResponse.builder()
                .id(l.getId())
                .numero(l.getNumero())
                .dataLancamento(l.getDataLancamento())
                .dataCompetencia(l.getDataCompetencia())
                .tipo(l.getTipo().name())
                .origemTipo(l.getOrigemTipo().name())
                .historicoPadrao(l.getHistoricoPadrao())
                .historicoComplementar(l.getHistoricoComplementar())
                .partidas(l.getPartidas().stream().map(p -> LancamentoResponse.PartidaResponse.builder()
                        .contaId(p.getContaId())
                        .contaCodigo(p.getContaCodigo())
                        .contaDescricao(p.getContaDescricao())
                        .tipo(p.getTipo().name())
                        .valor(p.getValor())
                        .historicoPartida(p.getHistoricoPartida())
                        .centroCustoId(p.getCentroCustoId())
                        .centroCustoNome(p.getCentroCustoNome())
                        .build()).toList())
                .valorTotal(l.getValorTotal())
                .status(l.getStatus().name())
                .loteId(l.getLoteId())
                .createdAt(l.getCreatedAt())
                .build();
    }
}
