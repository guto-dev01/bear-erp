package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.contabilidade.application.dto.BalancoPatrimonialResponse;
import br.com.bearerp.contabilidade.application.dto.BalancoPatrimonialResponse.*;
import br.com.bearerp.contabilidade.domain.model.PlanoContas;
import br.com.bearerp.contabilidade.domain.model.SaldoConta;
import br.com.bearerp.contabilidade.domain.repository.PlanoContasRepository;
import br.com.bearerp.contabilidade.domain.repository.SaldoContaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class BalancoPatrimonialUseCase {

    private final SaldoContaRepository saldoContaRepository;
    private final PlanoContasRepository planoContasRepository;

    public BalancoPatrimonialResponse gerarBalanco(LocalDate dataBase) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        int ano = dataBase.getYear();
        int mes = dataBase.getMonthValue();

        List<SaldoConta> saldos = saldoContaRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes);
        List<PlanoContas> contas = planoContasRepository.findByTenantIdAndEmpresaIdOrderByCodigoAsc(tenantId, empresaId);

        Map<String, SaldoConta> saldoPorContaId = new HashMap<>();
        for (SaldoConta s : saldos) saldoPorContaId.put(s.getContaId(), s);

        GrupoBalanco ativo = buildGrupo("ATIVO", PlanoContas.Classificacao.ATIVO, contas, saldoPorContaId);
        GrupoBalanco passivo = buildGrupo("PASSIVO", PlanoContas.Classificacao.PASSIVO, contas, saldoPorContaId);
        GrupoBalanco pl = buildGrupo("PATRIMÔNIO LÍQUIDO", PlanoContas.Classificacao.PATRIMONIO_LIQUIDO, contas, saldoPorContaId);

        BigDecimal totalAtivo = ativo.getTotal();
        BigDecimal totalPassivoPl = passivo.getTotal().add(pl.getTotal());

        return BalancoPatrimonialResponse.builder()
                .dataBase(dataBase)
                .dataGeracao(Instant.now())
                .ativo(ativo)
                .passivo(passivo)
                .patrimonioLiquido(pl)
                .totalAtivo(totalAtivo)
                .totalPassivoPl(totalPassivoPl)
                .build();
    }

    private GrupoBalanco buildGrupo(String descricao, PlanoContas.Classificacao classificacao,
                                     List<PlanoContas> contas, Map<String, SaldoConta> saldos) {
        List<ContaBalanco> contasGrupo = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (PlanoContas conta : contas) {
            if (conta.getClassificacao() == classificacao) {
                SaldoConta saldo = saldos.get(conta.getId());
                BigDecimal valor = saldo != null ? saldo.getSaldoAtual() : BigDecimal.ZERO;

                if (valor.signum() != 0 || conta.getNivel() <= 2) {
                    contasGrupo.add(ContaBalanco.builder()
                            .contaCodigo(conta.getCodigo())
                            .contaDescricao(conta.getDescricao())
                            .nivel(conta.getNivel())
                            .saldo(valor)
                            .build());
                }

                if (conta.getTipo() == PlanoContas.TipoConta.ANALITICA && saldo != null) {
                    total = total.add(saldo.getSaldoAtual());
                }
            }
        }

        return GrupoBalanco.builder()
                .descricao(descricao)
                .contas(contasGrupo)
                .total(total)
                .build();
    }
}
