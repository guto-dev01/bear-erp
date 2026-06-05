package br.com.bearerp.financeiroservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.financeiroservice.application.dto.FluxoCaixaResponse;
import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import br.com.bearerp.financeiroservice.domain.model.ContaReceber;
import br.com.bearerp.financeiroservice.domain.repository.ContaBancariaRepository;
import br.com.bearerp.financeiroservice.domain.repository.ContaPagarRepository;
import br.com.bearerp.financeiroservice.domain.repository.ContaReceberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service @RequiredArgsConstructor
public class FluxoCaixaUseCase {
    private final ContaPagarRepository contaPagarRepository;
    private final ContaReceberRepository contaReceberRepository;
    private final ContaBancariaRepository contaBancariaRepository;

    public FluxoCaixaResponse gerarFluxoCaixa(LocalDate dataInicio, LocalDate dataFim) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        // Saldo inicial: soma de todas as contas bancárias ativas
        BigDecimal saldoInicial = contaBancariaRepository.findByTenantIdAndEmpresaIdAndAtiva(tenantId, empresaId, true)
                .stream().map(c -> c.getSaldoAtual() != null ? c.getSaldoAtual() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Contas a pagar no período (saídas previstas)
        List<ContaPagar> contasPagar = contaPagarRepository.findByTenantIdAndEmpresaIdAndDataVencimentoBetween(tenantId, empresaId, dataInicio, dataFim);
        // Contas a receber no período (entradas previstas)
        List<ContaReceber> contasReceber = contaReceberRepository.findByTenantIdAndEmpresaIdAndDataVencimentoBetween(tenantId, empresaId, dataInicio, dataFim);

        List<FluxoCaixaResponse.ItemFluxo> itens = new ArrayList<>();
        BigDecimal totalEntradas = BigDecimal.ZERO;
        BigDecimal totalSaidas = BigDecimal.ZERO;

        for (ContaReceber cr : contasReceber) {
            BigDecimal valor = cr.getValorOriginal().subtract(cr.getValorDesconto() != null ? cr.getValorDesconto() : BigDecimal.ZERO);
            totalEntradas = totalEntradas.add(valor);
            itens.add(FluxoCaixaResponse.ItemFluxo.builder()
                    .data(cr.getDataVencimento()).descricao(cr.getDescricao())
                    .tipo("ENTRADA").valor(valor).origem("CONTA_RECEBER").build());
        }

        for (ContaPagar cp : contasPagar) {
            BigDecimal valor = cp.getValorOriginal().subtract(cp.getValorDesconto() != null ? cp.getValorDesconto() : BigDecimal.ZERO);
            totalSaidas = totalSaidas.add(valor);
            itens.add(FluxoCaixaResponse.ItemFluxo.builder()
                    .data(cp.getDataVencimento()).descricao(cp.getDescricao())
                    .tipo("SAIDA").valor(valor).origem("CONTA_PAGAR").build());
        }

        // Ordenar por data e calcular saldo acumulado
        itens.sort(Comparator.comparing(FluxoCaixaResponse.ItemFluxo::getData));
        BigDecimal saldoAcumulado = saldoInicial;
        for (FluxoCaixaResponse.ItemFluxo item : itens) {
            if ("ENTRADA".equals(item.getTipo())) {
                saldoAcumulado = saldoAcumulado.add(item.getValor());
            } else {
                saldoAcumulado = saldoAcumulado.subtract(item.getValor());
            }
            item.setSaldoAcumulado(saldoAcumulado);
        }

        return FluxoCaixaResponse.builder()
                .dataInicio(dataInicio).dataFim(dataFim)
                .saldoInicial(saldoInicial)
                .totalEntradas(totalEntradas).totalSaidas(totalSaidas)
                .saldoFinal(saldoInicial.add(totalEntradas).subtract(totalSaidas))
                .itens(itens).build();
    }
}
