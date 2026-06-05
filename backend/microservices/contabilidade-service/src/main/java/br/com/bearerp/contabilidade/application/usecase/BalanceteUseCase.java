package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.contabilidade.application.dto.BalanceteResponse;
import br.com.bearerp.contabilidade.application.dto.BalanceteResponse.LinhaBalancete;
import br.com.bearerp.contabilidade.domain.model.PlanoContas;
import br.com.bearerp.contabilidade.domain.model.SaldoConta;
import br.com.bearerp.contabilidade.domain.repository.PlanoContasRepository;
import br.com.bearerp.contabilidade.domain.repository.SaldoContaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BalanceteUseCase {

    private final SaldoContaRepository saldoContaRepository;
    private final PlanoContasRepository planoContasRepository;

    public BalanceteResponse gerarBalancete(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        List<SaldoConta> saldos = saldoContaRepository.findByTenantIdAndEmpresaIdAndAnoAndMesOrderByContaCodigoAsc(tenantId, empresaId, ano, mes);
        List<PlanoContas> todasContas = planoContasRepository.findByTenantIdAndEmpresaIdOrderByCodigoAsc(tenantId, empresaId);

        Map<String, SaldoConta> saldoPorContaId = saldos.stream()
                .collect(Collectors.toMap(SaldoConta::getContaId, s -> s));

        // Calcular saldos das contas sintéticas somando as analíticas
        Map<String, BigDecimal[]> saldosSinteticos = new HashMap<>();
        for (PlanoContas conta : todasContas) {
            if (conta.getTipo() == PlanoContas.TipoConta.SINTETICA) {
                BigDecimal[] totais = calcularTotalSintetica(conta, todasContas, saldoPorContaId);
                saldosSinteticos.put(conta.getId(), totais);
            }
        }

        List<LinhaBalancete> linhas = new ArrayList<>();
        BigDecimal totalDebitos = BigDecimal.ZERO;
        BigDecimal totalCreditos = BigDecimal.ZERO;

        for (PlanoContas conta : todasContas) {
            SaldoConta saldo = saldoPorContaId.get(conta.getId());
            BigDecimal[] sintetico = saldosSinteticos.get(conta.getId());

            BigDecimal deb, cred, saldoAnt, saldoAt;

            if (conta.getTipo() == PlanoContas.TipoConta.SINTETICA && sintetico != null) {
                saldoAnt = sintetico[0];
                deb = sintetico[1];
                cred = sintetico[2];
                saldoAt = sintetico[3];
            } else if (saldo != null) {
                saldoAnt = saldo.getSaldoAnterior();
                deb = saldo.getTotalDebitos();
                cred = saldo.getTotalCreditos();
                saldoAt = saldo.getSaldoAtual();
            } else {
                continue;
            }

            if (deb.signum() == 0 && cred.signum() == 0 && saldoAnt.signum() == 0 && saldoAt.signum() == 0) {
                continue;
            }

            linhas.add(LinhaBalancete.builder()
                    .contaCodigo(conta.getCodigo())
                    .contaDescricao(conta.getDescricao())
                    .natureza(conta.getNatureza().name())
                    .classificacao(conta.getClassificacao().name())
                    .nivel(conta.getNivel())
                    .saldoAnterior(saldoAnt)
                    .debitos(deb)
                    .creditos(cred)
                    .saldoAtual(saldoAt)
                    .build());

            if (conta.getTipo() == PlanoContas.TipoConta.ANALITICA) {
                totalDebitos = totalDebitos.add(deb);
                totalCreditos = totalCreditos.add(cred);
            }
        }

        return BalanceteResponse.builder()
                .ano(ano)
                .mes(mes)
                .dataGeracao(Instant.now())
                .contas(linhas)
                .totalDebitos(totalDebitos)
                .totalCreditos(totalCreditos)
                .build();
    }

    private BigDecimal[] calcularTotalSintetica(PlanoContas sintetica, List<PlanoContas> todasContas, Map<String, SaldoConta> saldoPorContaId) {
        BigDecimal totalSaldoAnterior = BigDecimal.ZERO;
        BigDecimal totalDebitos = BigDecimal.ZERO;
        BigDecimal totalCreditos = BigDecimal.ZERO;
        BigDecimal totalSaldoAtual = BigDecimal.ZERO;

        String prefixo = sintetica.getCodigo() + ".";
        for (PlanoContas c : todasContas) {
            if (c.getTipo() == PlanoContas.TipoConta.ANALITICA && c.getCodigo().startsWith(prefixo)) {
                SaldoConta s = saldoPorContaId.get(c.getId());
                if (s != null) {
                    totalSaldoAnterior = totalSaldoAnterior.add(s.getSaldoAnterior());
                    totalDebitos = totalDebitos.add(s.getTotalDebitos());
                    totalCreditos = totalCreditos.add(s.getTotalCreditos());
                    totalSaldoAtual = totalSaldoAtual.add(s.getSaldoAtual());
                }
            }
        }

        return new BigDecimal[]{totalSaldoAnterior, totalDebitos, totalCreditos, totalSaldoAtual};
    }
}
