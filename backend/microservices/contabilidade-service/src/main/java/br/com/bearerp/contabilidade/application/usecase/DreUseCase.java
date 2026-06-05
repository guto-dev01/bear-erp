package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.contabilidade.application.dto.DreResponse;
import br.com.bearerp.contabilidade.application.dto.DreResponse.LinhaDre;
import br.com.bearerp.contabilidade.domain.model.PlanoContas;
import br.com.bearerp.contabilidade.domain.model.SaldoConta;
import br.com.bearerp.contabilidade.domain.repository.PlanoContasRepository;
import br.com.bearerp.contabilidade.domain.repository.SaldoContaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DreUseCase {

    private final SaldoContaRepository saldoContaRepository;
    private final PlanoContasRepository planoContasRepository;

    public DreResponse gerarDre(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        List<SaldoConta> saldos = saldoContaRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes);
        List<PlanoContas> contas = planoContasRepository.findByTenantIdAndEmpresaIdOrderByCodigoAsc(tenantId, empresaId);

        Map<String, SaldoConta> saldoPorContaId = new HashMap<>();
        for (SaldoConta s : saldos) saldoPorContaId.put(s.getContaId(), s);

        List<LinhaDre> linhas = new ArrayList<>();

        // RECEITA BRUTA (4.1)
        BigDecimal receitaBruta = somarContasPorPrefixo("4.1", contas, saldoPorContaId, linhas);
        // DEDUÇÕES (4.2) - valor absoluto
        BigDecimal deducoes = somarContasPorPrefixo("4.2", contas, saldoPorContaId, linhas).abs();
        BigDecimal receitaLiquida = receitaBruta.subtract(deducoes);

        // CUSTOS (5)
        BigDecimal custos = somarContasPorPrefixo("5", contas, saldoPorContaId, linhas).abs();
        BigDecimal lucroBruto = receitaLiquida.subtract(custos);

        // DESPESAS ADMINISTRATIVAS (6.1)
        BigDecimal despAdmin = somarContasPorPrefixo("6.1", contas, saldoPorContaId, linhas).abs();
        // DESPESAS COMERCIAIS (6.2)
        BigDecimal despCom = somarContasPorPrefixo("6.2", contas, saldoPorContaId, linhas).abs();
        BigDecimal despesasOperacionais = despAdmin.add(despCom);

        BigDecimal resultadoOperacional = lucroBruto.subtract(despesasOperacionais);

        // RESULTADO FINANCEIRO (6.3 - despesas financeiras, 6.4 - receitas financeiras)
        BigDecimal despFinanceiras = somarContasPorPrefixo("6.3", contas, saldoPorContaId, linhas).abs();
        BigDecimal recFinanceiras = somarContasPorPrefixo("6.4", contas, saldoPorContaId, linhas).abs();
        BigDecimal resultadoFinanceiro = recFinanceiras.subtract(despFinanceiras);

        BigDecimal resultadoAntesIr = resultadoOperacional.add(resultadoFinanceiro);

        // PROVISÃO IR/CSLL (6.5)
        BigDecimal provisaoIrCsll = somarContasPorPrefixo("6.5", contas, saldoPorContaId, linhas).abs();

        BigDecimal lucroLiquido = resultadoAntesIr.subtract(provisaoIrCsll);

        // Calcular percentuais sobre receita líquida
        if (receitaLiquida.signum() != 0) {
            for (LinhaDre linha : linhas) {
                linha.setPercentual(linha.getValor().divide(receitaLiquida, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)));
            }
        }

        return DreResponse.builder()
                .ano(ano)
                .mes(mes)
                .dataInicio(LocalDate.of(ano, mes, 1))
                .dataFim(LocalDate.of(ano, mes, 1).withDayOfMonth(LocalDate.of(ano, mes, 1).lengthOfMonth()))
                .dataGeracao(Instant.now())
                .linhas(linhas)
                .receitaBruta(receitaBruta)
                .deducoes(deducoes)
                .receitaLiquida(receitaLiquida)
                .custos(custos)
                .lucroBruto(lucroBruto)
                .despesasOperacionais(despesasOperacionais)
                .resultadoOperacional(resultadoOperacional)
                .resultadoFinanceiro(resultadoFinanceiro)
                .resultadoAntesIr(resultadoAntesIr)
                .provisaoIrCsll(provisaoIrCsll)
                .lucroLiquido(lucroLiquido)
                .build();
    }

    private BigDecimal somarContasPorPrefixo(String prefixo, List<PlanoContas> contas, Map<String, SaldoConta> saldos, List<LinhaDre> linhas) {
        BigDecimal total = BigDecimal.ZERO;

        for (PlanoContas conta : contas) {
            if (conta.getCodigo().startsWith(prefixo) && conta.getTipo() == PlanoContas.TipoConta.ANALITICA) {
                SaldoConta saldo = saldos.get(conta.getId());
                if (saldo != null && saldo.getSaldoAtual().signum() != 0) {
                    BigDecimal valor = saldo.getSaldoAtual();
                    total = total.add(valor);

                    linhas.add(LinhaDre.builder()
                            .contaCodigo(conta.getCodigo())
                            .contaDescricao(conta.getDescricao())
                            .nivel(conta.getNivel())
                            .valor(valor)
                            .build());
                }
            }
        }

        return total;
    }
}
