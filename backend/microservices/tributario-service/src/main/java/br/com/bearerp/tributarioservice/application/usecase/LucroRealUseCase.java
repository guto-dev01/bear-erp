package br.com.bearerp.tributarioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.tributarioservice.domain.model.ApuracaoLucroReal;
import br.com.bearerp.tributarioservice.domain.repository.ApuracaoLucroRealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service @RequiredArgsConstructor
public class LucroRealUseCase {
    private final ApuracaoLucroRealRepository repository;

    public ApuracaoLucroReal calcular(String periodo, ApuracaoLucroReal.TipoPeriodo tipoPeriodo,
                                       BigDecimal lucroContabil, List<ApuracaoLucroReal.AjusteLalur> ajustes,
                                       BigDecimal saldoPrejuizoAnterior, BigDecimal saldoBaseNegativaCsllAnterior,
                                       BigDecimal creditosPisCofins) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        // LALUR Parte A
        BigDecimal adicoes = BigDecimal.ZERO;
        BigDecimal exclusoes = BigDecimal.ZERO;

        if (ajustes != null) {
            for (ApuracaoLucroReal.AjusteLalur ajuste : ajustes) {
                switch (ajuste.getTipo()) {
                    case ADICAO -> adicoes = adicoes.add(ajuste.getValor());
                    case EXCLUSAO -> exclusoes = exclusoes.add(ajuste.getValor());
                    case COMPENSACAO -> {} // tratado separadamente
                }
            }
        }

        BigDecimal lucroAjustado = lucroContabil.add(adicoes).subtract(exclusoes);

        // Compensação de prejuízos fiscais (máximo 30% do lucro ajustado)
        BigDecimal compensacoes = BigDecimal.ZERO;
        BigDecimal saldoPrejuizo = saldoPrejuizoAnterior != null ? saldoPrejuizoAnterior : BigDecimal.ZERO;
        if (lucroAjustado.compareTo(BigDecimal.ZERO) > 0 && saldoPrejuizo.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal maxCompensacao = lucroAjustado.multiply(BigDecimal.valueOf(0.30)).setScale(2, RoundingMode.HALF_UP);
            compensacoes = saldoPrejuizo.min(maxCompensacao);
        }

        BigDecimal lucroReal = lucroAjustado.subtract(compensacoes);
        BigDecimal novoPrejuizo = BigDecimal.ZERO;
        if (lucroReal.compareTo(BigDecimal.ZERO) < 0) {
            novoPrejuizo = lucroReal.abs();
            lucroReal = BigDecimal.ZERO;
        }

        // IRPJ: 15% + adicional 10%
        BigDecimal limiteAdicional = tipoPeriodo == ApuracaoLucroReal.TipoPeriodo.MENSAL
                ? BigDecimal.valueOf(20000) : BigDecimal.valueOf(60000);

        BigDecimal irpjNormal = lucroReal.multiply(BigDecimal.valueOf(0.15)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal irpjAdicional = BigDecimal.ZERO;
        if (lucroReal.compareTo(limiteAdicional) > 0) {
            irpjAdicional = lucroReal.subtract(limiteAdicional).multiply(BigDecimal.valueOf(0.10)).setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal irpjTotal = irpjNormal.add(irpjAdicional);

        // CSLL: 9%
        BigDecimal baseCsll = lucroAjustado.subtract(compensacoes);
        if (baseCsll.compareTo(BigDecimal.ZERO) < 0) baseCsll = BigDecimal.ZERO;
        BigDecimal csll = baseCsll.multiply(BigDecimal.valueOf(0.09)).setScale(2, RoundingMode.HALF_UP);

        // Base negativa CSLL
        BigDecimal saldoBaseNeg = saldoBaseNegativaCsllAnterior != null ? saldoBaseNegativaCsllAnterior : BigDecimal.ZERO;
        BigDecimal novaBaseNeg = baseCsll.compareTo(BigDecimal.ZERO) < 0 ? baseCsll.abs() : BigDecimal.ZERO;

        // PIS/COFINS não-cumulativo (Lucro Real)
        // Receita base = lucro contábil (simplificação)
        BigDecimal baseReceita = lucroContabil.compareTo(BigDecimal.ZERO) > 0 ? lucroContabil : BigDecimal.ZERO;
        BigDecimal pisDebito = baseReceita.multiply(BigDecimal.valueOf(0.0165)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal cofinsDebito = baseReceita.multiply(BigDecimal.valueOf(0.076)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal creditos = creditosPisCofins != null ? creditosPisCofins : BigDecimal.ZERO;
        BigDecimal pisAPagar = pisDebito.subtract(creditos.multiply(BigDecimal.valueOf(0.0165)).divide(BigDecimal.valueOf(0.076).add(BigDecimal.valueOf(0.0165)), 4, RoundingMode.HALF_UP)).max(BigDecimal.ZERO);
        BigDecimal cofinsAPagar = cofinsDebito.subtract(creditos.subtract(creditos.multiply(BigDecimal.valueOf(0.0165)).divide(BigDecimal.valueOf(0.076).add(BigDecimal.valueOf(0.0165)), 4, RoundingMode.HALF_UP))).max(BigDecimal.ZERO);

        BigDecimal total = irpjTotal.add(csll).add(pisAPagar).add(cofinsAPagar);

        ApuracaoLucroReal apuracao = ApuracaoLucroReal.builder()
                .tenantId(tenantId).empresaId(empresaId)
                .periodo(periodo).tipoPeriodo(tipoPeriodo)
                .lucroContabil(lucroContabil).adicoes(adicoes).exclusoes(exclusoes)
                .compensacoes(compensacoes).lucroReal(lucroReal)
                .ajustes(ajustes)
                .baseCalculoIrpj(lucroReal).irpjNormal(irpjNormal).irpjAdicional(irpjAdicional).irpjTotal(irpjTotal)
                .baseCalculoCsll(baseCsll).csll(csll)
                .pisNaoCumulativo(pisDebito).cofinsNaoCumulativo(cofinsDebito)
                .creditosPisCofins(creditos)
                .pisAPagar(pisAPagar).cofinsAPagar(cofinsAPagar)
                .saldoPrejuizoFiscalAnterior(saldoPrejuizo)
                .saldoPrejuizoFiscalAtual(saldoPrejuizo.subtract(compensacoes).add(novoPrejuizo))
                .saldoBaseNegativaCsllAnterior(saldoBaseNeg)
                .saldoBaseNegativaCsllAtual(saldoBaseNeg.add(novaBaseNeg))
                .totalTributos(total)
                .build();

        return repository.save(apuracao);
    }

    public ApuracaoLucroReal consultar(String periodo) {
        return repository.findByTenantIdAndEmpresaIdAndPeriodo(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), periodo)
                .orElseThrow(() -> new RuntimeException("Apuração não encontrada para período " + periodo));
    }

    public List<ApuracaoLucroReal> listar() {
        return repository.findByTenantIdAndEmpresaId(TenantContext.getTenantId(), TenantContext.getEmpresaId());
    }
}
