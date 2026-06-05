package br.com.bearerp.folhaservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.folhaservice.application.dto.*;
import br.com.bearerp.folhaservice.domain.model.Funcionario;
import br.com.bearerp.folhaservice.domain.model.Rescisao;
import br.com.bearerp.folhaservice.domain.model.Rescisao.*;
import br.com.bearerp.folhaservice.domain.repository.FuncionarioRepository;
import br.com.bearerp.folhaservice.domain.repository.RescisaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RescisaoUseCase {

    private final RescisaoRepository rescisaoRepository;
    private final FuncionarioRepository funcionarioRepository;

    public RescisaoResponse calcular(CreateRescisaoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        Funcionario func = funcionarioRepository.findById(request.getFuncionarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário", request.getFuncionarioId()));

        TipoRescisao tipo = TipoRescisao.valueOf(request.getTipo());
        LocalDate dataDesligamento = LocalDate.parse(request.getDataDesligamento());
        LocalDate dataAdmissao = func.getDataAdmissao();
        BigDecimal salario = func.getSalarioBase();

        // Dias trabalhados no mês
        int diasNoMes = dataDesligamento.getDayOfMonth();
        BigDecimal saldoSalario = salario.divide(BigDecimal.valueOf(30), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(diasNoMes)).setScale(2, RoundingMode.HALF_UP);

        // Meses trabalhados no ano (para 13º proporcional)
        int mesesAno = dataDesligamento.getMonthValue();
        BigDecimal decimoTerceiro = salario.divide(BigDecimal.valueOf(12), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(mesesAno)).setScale(2, RoundingMode.HALF_UP);

        // Férias proporcionais (meses desde último período aquisitivo)
        long mesesTrabalhados = ChronoUnit.MONTHS.between(dataAdmissao, dataDesligamento);
        int mesesFeriasProp = (int) (mesesTrabalhados % 12);
        if (mesesFeriasProp == 0 && mesesTrabalhados > 0) mesesFeriasProp = 12;
        BigDecimal feriasProporcionais = salario.divide(BigDecimal.valueOf(12), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(mesesFeriasProp)).setScale(2, RoundingMode.HALF_UP);

        // Férias vencidas (se >12 meses sem tirar férias)
        BigDecimal feriasVencidas = mesesTrabalhados >= 12 ? salario : BigDecimal.ZERO;

        // 1/3 sobre férias
        BigDecimal tercoFerias = feriasProporcionais.add(feriasVencidas)
                .divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);

        // Aviso prévio indenizado (SEM_JUSTA_CAUSA ou ACORDO_MUTUO)
        BigDecimal avisoPrevio = BigDecimal.ZERO;
        if (tipo == TipoRescisao.SEM_JUSTA_CAUSA) {
            int diasAviso = 30 + (int) Math.min(mesesTrabalhados / 12 * 3, 60); // CLT art. 477
            avisoPrevio = salario.divide(BigDecimal.valueOf(30), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(diasAviso)).setScale(2, RoundingMode.HALF_UP);
        } else if (tipo == TipoRescisao.ACORDO_MUTUO) {
            avisoPrevio = salario.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP); // 50% do aviso
        }

        // Multa FGTS
        BigDecimal saldoFgts = salario.multiply(BigDecimal.valueOf(0.08)).multiply(BigDecimal.valueOf(mesesTrabalhados)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal multaFgts = BigDecimal.ZERO;
        if (tipo == TipoRescisao.SEM_JUSTA_CAUSA) {
            multaFgts = saldoFgts.multiply(BigDecimal.valueOf(0.40)).setScale(2, RoundingMode.HALF_UP);
        } else if (tipo == TipoRescisao.ACORDO_MUTUO) {
            multaFgts = saldoFgts.multiply(BigDecimal.valueOf(0.20)).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal totalProventos = saldoSalario.add(decimoTerceiro).add(feriasProporcionais)
                .add(feriasVencidas).add(tercoFerias).add(avisoPrevio);

        // Descontos
        BigDecimal descontoInss = calcularInss(totalProventos);
        BigDecimal baseIrrf = totalProventos.subtract(descontoInss);
        BigDecimal descontoIrrf = calcularIrrf(baseIrrf);
        BigDecimal totalDescontos = descontoInss.add(descontoIrrf);
        BigDecimal valorLiquido = totalProventos.subtract(totalDescontos);

        Rescisao rescisao = Rescisao.builder()
                .funcionarioId(func.getId()).funcionarioNome(func.getNome())
                .dataDesligamento(dataDesligamento).tipo(tipo)
                .saldoSalario(saldoSalario).avisoPreviolIndenizado(avisoPrevio)
                .decimoTerceiroProporcional(decimoTerceiro)
                .feriasVencidas(feriasVencidas).feriasProporcionais(feriasProporcionais)
                .tercoFerias(tercoFerias).multaFgts(multaFgts).saqueFgts(saldoFgts)
                .descontoInss(descontoInss).descontoIrrf(descontoIrrf)
                .outrosDescontos(BigDecimal.ZERO)
                .totalProventos(totalProventos).totalDescontos(totalDescontos)
                .valorLiquido(valorLiquido)
                .status(StatusRescisao.CALCULADA)
                .build();
        rescisao.setTenantId(tenantId);
        rescisao.setEmpresaId(empresaId);

        rescisao = rescisaoRepository.save(rescisao);
        log.info("Rescisão calculada: {} tipo {} líquido {} (tenant: {})", func.getNome(), tipo, valorLiquido, tenantId);
        return toResponse(rescisao);
    }

    public RescisaoResponse homologar(String id) {
        Rescisao r = rescisaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rescisão", id));
        r.setStatus(StatusRescisao.HOMOLOGADA);
        r = rescisaoRepository.save(r);
        return toResponse(r);
    }

    public List<RescisaoResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return rescisaoRepository.findByTenantIdAndEmpresaId(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public RescisaoResponse getById(String id) {
        return toResponse(rescisaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rescisão", id)));
    }

    private BigDecimal calcularInss(BigDecimal base) {
        BigDecimal inss = BigDecimal.ZERO;
        BigDecimal r = base;
        BigDecimal f1 = BigDecimal.valueOf(1412); BigDecimal f2 = BigDecimal.valueOf(1254.68); BigDecimal f3 = BigDecimal.valueOf(1333.35); BigDecimal f4 = BigDecimal.valueOf(3785.99);
        if (r.compareTo(BigDecimal.ZERO) > 0) { inss = inss.add(r.min(f1).multiply(BigDecimal.valueOf(0.075))); r = r.subtract(f1).max(BigDecimal.ZERO); }
        if (r.compareTo(BigDecimal.ZERO) > 0) { inss = inss.add(r.min(f2).multiply(BigDecimal.valueOf(0.09))); r = r.subtract(f2).max(BigDecimal.ZERO); }
        if (r.compareTo(BigDecimal.ZERO) > 0) { inss = inss.add(r.min(f3).multiply(BigDecimal.valueOf(0.12))); r = r.subtract(f3).max(BigDecimal.ZERO); }
        if (r.compareTo(BigDecimal.ZERO) > 0) { inss = inss.add(r.min(f4).multiply(BigDecimal.valueOf(0.14))); }
        return inss.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calcularIrrf(BigDecimal base) {
        if (base.compareTo(BigDecimal.valueOf(2259.20)) <= 0) return BigDecimal.ZERO;
        if (base.compareTo(BigDecimal.valueOf(2826.65)) <= 0) return base.multiply(BigDecimal.valueOf(0.075)).subtract(BigDecimal.valueOf(169.44)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        if (base.compareTo(BigDecimal.valueOf(3751.05)) <= 0) return base.multiply(BigDecimal.valueOf(0.15)).subtract(BigDecimal.valueOf(381.44)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        if (base.compareTo(BigDecimal.valueOf(4664.68)) <= 0) return base.multiply(BigDecimal.valueOf(0.225)).subtract(BigDecimal.valueOf(662.77)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        return base.multiply(BigDecimal.valueOf(0.275)).subtract(BigDecimal.valueOf(896.00)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private RescisaoResponse toResponse(Rescisao r) {
        return RescisaoResponse.builder()
                .id(r.getId()).funcionarioId(r.getFuncionarioId()).funcionarioNome(r.getFuncionarioNome())
                .dataDesligamento(r.getDataDesligamento()).dataAvisoPrevio(r.getDataAvisoPrevio())
                .tipo(r.getTipo() != null ? r.getTipo().name() : null)
                .saldoSalario(r.getSaldoSalario()).avisoPreviolIndenizado(r.getAvisoPreviolIndenizado())
                .decimoTerceiroProporcional(r.getDecimoTerceiroProporcional())
                .feriasVencidas(r.getFeriasVencidas()).feriasProporcionais(r.getFeriasProporcionais())
                .tercoFerias(r.getTercoFerias()).multaFgts(r.getMultaFgts()).saqueFgts(r.getSaqueFgts())
                .descontoInss(r.getDescontoInss()).descontoIrrf(r.getDescontoIrrf())
                .outrosDescontos(r.getOutrosDescontos())
                .totalProventos(r.getTotalProventos()).totalDescontos(r.getTotalDescontos())
                .valorLiquido(r.getValorLiquido())
                .status(r.getStatus() != null ? r.getStatus().name() : null)
                .createdAt(r.getCreatedAt())
                .build();
    }
}
