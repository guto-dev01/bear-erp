package br.com.bearerp.folhaservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.folhaservice.application.dto.FolhaResumoResponse;
import br.com.bearerp.folhaservice.application.dto.HoleriteResponse;
import br.com.bearerp.folhaservice.domain.model.*;
import br.com.bearerp.folhaservice.domain.model.Funcionario.StatusFuncionario;
import br.com.bearerp.folhaservice.domain.model.FolhaPagamento.*;
import br.com.bearerp.folhaservice.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CalculoFolhaUseCase {

    private final FuncionarioRepository funcionarioRepository;
    private final FolhaPagamentoRepository folhaRepository;
    private final HoleriteRepository holeriteRepository;

    // Tabela INSS 2024 (faixas progressivas)
    private static final BigDecimal[] INSS_FAIXAS = {
        new BigDecimal("1412.00"), new BigDecimal("2666.68"),
        new BigDecimal("4000.03"), new BigDecimal("7786.02")
    };
    private static final BigDecimal[] INSS_ALIQUOTAS = {
        new BigDecimal("0.075"), new BigDecimal("0.09"),
        new BigDecimal("0.12"), new BigDecimal("0.14")
    };

    // Tabela IRRF 2024
    private static final BigDecimal[] IRRF_FAIXAS = {
        new BigDecimal("2259.20"), new BigDecimal("2826.65"),
        new BigDecimal("3751.05"), new BigDecimal("4664.68")
    };
    private static final BigDecimal[] IRRF_ALIQUOTAS = {
        BigDecimal.ZERO, new BigDecimal("0.075"),
        new BigDecimal("0.15"), new BigDecimal("0.225"), new BigDecimal("0.275")
    };
    private static final BigDecimal[] IRRF_DEDUCOES = {
        BigDecimal.ZERO, new BigDecimal("169.44"),
        new BigDecimal("381.44"), new BigDecimal("662.77"), new BigDecimal("896.00")
    };
    private static final BigDecimal DEDUCAO_POR_DEPENDENTE = new BigDecimal("189.59");
    private static final BigDecimal ALIQUOTA_FGTS = new BigDecimal("0.08");

    public FolhaResumoResponse calcularFolha(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        FolhaPagamento folha = folhaRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .orElseGet(() -> {
                    FolhaPagamento nova = FolhaPagamento.builder()
                            .ano(ano).mes(mes).tipo(TipoFolha.MENSAL).status(StatusFolha.ABERTA).build();
                    nova.setTenantId(tenantId);
                    nova.setEmpresaId(empresaId);
                    return nova;
                });

        if (folha.getStatus() == StatusFolha.FECHADA) {
            throw new BusinessException("FOLHA_FECHADA", "Folha já está fechada");
        }

        List<Funcionario> ativos = funcionarioRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, StatusFuncionario.ATIVO);

        BigDecimal totalProventos = BigDecimal.ZERO;
        BigDecimal totalDescontos = BigDecimal.ZERO;
        BigDecimal totalLiquido = BigDecimal.ZERO;
        BigDecimal totalInss = BigDecimal.ZERO;
        BigDecimal totalIrrf = BigDecimal.ZERO;
        BigDecimal totalFgts = BigDecimal.ZERO;
        BigDecimal totalInssPatronal = BigDecimal.ZERO;
        List<String> holeritesIds = new ArrayList<>();

        for (Funcionario func : ativos) {
            Holerite holerite = calcularHolerite(func, ano, mes, tenantId, empresaId);
            holerite = holeriteRepository.save(holerite);
            holeritesIds.add(holerite.getId());

            totalProventos = totalProventos.add(holerite.getTotalProventos());
            totalDescontos = totalDescontos.add(holerite.getTotalDescontos());
            totalLiquido = totalLiquido.add(holerite.getSalarioLiquido());
            totalInss = totalInss.add(holerite.getValorInss());
            totalIrrf = totalIrrf.add(holerite.getValorIrrf());
            totalFgts = totalFgts.add(holerite.getValorFgts());
            totalInssPatronal = totalInssPatronal.add(holerite.getValorInssPatronal());
        }

        folha.setTotalProventos(totalProventos);
        folha.setTotalDescontos(totalDescontos);
        folha.setTotalLiquido(totalLiquido);
        folha.setTotalInss(totalInss);
        folha.setTotalIrrf(totalIrrf);
        folha.setTotalFgts(totalFgts);
        folha.setTotalInssPatronal(totalInssPatronal);
        folha.setTotalFuncionarios(ativos.size());
        folha.setHoleritesIds(holeritesIds);
        folha.setStatus(StatusFolha.CALCULADA);
        folha = folhaRepository.save(folha);

        log.info("Folha {}/{} calculada - {} funcionários - líquido: {} (tenant: {})", mes, ano, ativos.size(), totalLiquido, tenantId);
        return toFolhaResponse(folha);
    }

    private Holerite calcularHolerite(Funcionario func, int ano, int mes, String tenantId, String empresaId) {
        BigDecimal salarioBase = func.getSalarioBase();
        List<Holerite.Rubrica> proventos = new ArrayList<>();
        List<Holerite.Rubrica> descontos = new ArrayList<>();

        // Salário
        proventos.add(Holerite.Rubrica.builder().codigo("001").descricao("Salário Base").tipo("PROVENTO").referencia(new BigDecimal("30")).valor(salarioBase).build());

        BigDecimal totalProventos = salarioBase;

        // INSS (progressivo)
        BigDecimal valorInss = calcularInss(totalProventos);
        descontos.add(Holerite.Rubrica.builder().codigo("201").descricao("INSS").tipo("DESCONTO").valor(valorInss).build());

        // IRRF
        BigDecimal deducaoDep = DEDUCAO_POR_DEPENDENTE.multiply(BigDecimal.valueOf(func.getNumeroDependentesIr()));
        BigDecimal baseIrrf = totalProventos.subtract(valorInss).subtract(deducaoDep);
        BigDecimal valorIrrf = calcularIrrf(baseIrrf);
        if (valorIrrf.signum() > 0) {
            descontos.add(Holerite.Rubrica.builder().codigo("202").descricao("IRRF").tipo("DESCONTO").valor(valorIrrf).build());
        }

        BigDecimal totalDescontos = valorInss.add(valorIrrf);
        BigDecimal salarioLiquido = totalProventos.subtract(totalDescontos);

        // FGTS (encargo patronal)
        BigDecimal valorFgts = totalProventos.multiply(ALIQUOTA_FGTS).setScale(2, RoundingMode.HALF_UP);
        BigDecimal inssPatronal = totalProventos.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP);

        Holerite holerite = Holerite.builder()
                .funcionarioId(func.getId()).funcionarioNome(func.getNome())
                .funcionarioMatricula(func.getMatricula()).funcionarioCpf(func.getCpf())
                .cargo(func.getCargo()).departamento(func.getDepartamento())
                .ano(ano).mes(mes).salarioBase(salarioBase)
                .proventos(proventos).descontos(descontos)
                .totalProventos(totalProventos).totalDescontos(totalDescontos)
                .salarioLiquido(salarioLiquido)
                .baseInss(totalProventos).valorInss(valorInss)
                .baseIrrf(baseIrrf).valorIrrf(valorIrrf)
                .baseFgts(totalProventos).valorFgts(valorFgts)
                .valorInssPatronal(inssPatronal)
                .deducaoDependentes(deducaoDep).deducaoInss(valorInss)
                .diasTrabalhados(30)
                .build();
        holerite.setTenantId(tenantId);
        holerite.setEmpresaId(empresaId);
        return holerite;
    }

    private BigDecimal calcularInss(BigDecimal salario) {
        BigDecimal totalInss = BigDecimal.ZERO;
        BigDecimal anterior = BigDecimal.ZERO;

        for (int i = 0; i < INSS_FAIXAS.length; i++) {
            if (salario.compareTo(anterior) <= 0) break;
            BigDecimal faixaMax = INSS_FAIXAS[i].min(salario);
            BigDecimal baseNaFaixa = faixaMax.subtract(anterior);
            totalInss = totalInss.add(baseNaFaixa.multiply(INSS_ALIQUOTAS[i]));
            anterior = INSS_FAIXAS[i];
        }
        return totalInss.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calcularIrrf(BigDecimal baseCalculo) {
        if (baseCalculo.compareTo(IRRF_FAIXAS[0]) <= 0) return BigDecimal.ZERO;

        int faixa = 0;
        for (int i = IRRF_FAIXAS.length - 1; i >= 0; i--) {
            if (baseCalculo.compareTo(IRRF_FAIXAS[i]) > 0) {
                faixa = i + 1;
                break;
            }
        }
        BigDecimal irrf = baseCalculo.multiply(IRRF_ALIQUOTAS[faixa]).subtract(IRRF_DEDUCOES[faixa]);
        return irrf.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    public FolhaResumoResponse fecharFolha(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        FolhaPagamento folha = folhaRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .orElseThrow(() -> new BusinessException("FOLHA_NAO_ENCONTRADA", "Folha não encontrada"));
        folha.setStatus(StatusFolha.FECHADA);
        folha.setDataFechamento(Instant.now());
        folha = folhaRepository.save(folha);
        return toFolhaResponse(folha);
    }

    public List<HoleriteResponse> listarHolerites(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return holeriteRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .stream().map(this::toHoleriteResponse).toList();
    }

    public List<HoleriteResponse> listarHoleritesFuncionario(String funcionarioId) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return holeriteRepository.findByTenantIdAndEmpresaIdAndFuncionarioIdOrderByAnoDescMesDesc(tenantId, empresaId, funcionarioId)
                .stream().map(this::toHoleriteResponse).toList();
    }

    public List<FolhaResumoResponse> listarFolhas(int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return folhaRepository.findByTenantIdAndEmpresaIdAndAnoOrderByMesAsc(tenantId, empresaId, ano)
                .stream().map(this::toFolhaResponse).toList();
    }

    private FolhaResumoResponse toFolhaResponse(FolhaPagamento f) {
        return FolhaResumoResponse.builder()
                .id(f.getId()).ano(f.getAno()).mes(f.getMes())
                .tipo(f.getTipo().name()).status(f.getStatus().name())
                .totalProventos(f.getTotalProventos()).totalDescontos(f.getTotalDescontos())
                .totalLiquido(f.getTotalLiquido()).totalInss(f.getTotalInss())
                .totalIrrf(f.getTotalIrrf()).totalFgts(f.getTotalFgts())
                .totalInssPatronal(f.getTotalInssPatronal()).totalFuncionarios(f.getTotalFuncionarios())
                .build();
    }

    private HoleriteResponse toHoleriteResponse(Holerite h) {
        return HoleriteResponse.builder()
                .id(h.getId()).funcionarioId(h.getFuncionarioId())
                .funcionarioNome(h.getFuncionarioNome()).funcionarioMatricula(h.getFuncionarioMatricula())
                .cargo(h.getCargo()).departamento(h.getDepartamento())
                .ano(h.getAno()).mes(h.getMes()).salarioBase(h.getSalarioBase())
                .proventos(h.getProventos() != null ? h.getProventos().stream().map(r -> HoleriteResponse.RubricaDto.builder().codigo(r.getCodigo()).descricao(r.getDescricao()).referencia(r.getReferencia()).valor(r.getValor()).build()).toList() : List.of())
                .descontos(h.getDescontos() != null ? h.getDescontos().stream().map(r -> HoleriteResponse.RubricaDto.builder().codigo(r.getCodigo()).descricao(r.getDescricao()).referencia(r.getReferencia()).valor(r.getValor()).build()).toList() : List.of())
                .totalProventos(h.getTotalProventos()).totalDescontos(h.getTotalDescontos())
                .salarioLiquido(h.getSalarioLiquido())
                .baseInss(h.getBaseInss()).valorInss(h.getValorInss())
                .baseIrrf(h.getBaseIrrf()).valorIrrf(h.getValorIrrf())
                .baseFgts(h.getBaseFgts()).valorFgts(h.getValorFgts())
                .build();
    }
}
