package br.com.bearerp.folhaservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.folhaservice.application.dto.*;
import br.com.bearerp.folhaservice.domain.model.Ferias;
import br.com.bearerp.folhaservice.domain.model.Ferias.*;
import br.com.bearerp.folhaservice.domain.model.Funcionario;
import br.com.bearerp.folhaservice.domain.repository.FeriasRepository;
import br.com.bearerp.folhaservice.domain.repository.FuncionarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeriasUseCase {

    private final FeriasRepository feriasRepository;
    private final FuncionarioRepository funcionarioRepository;

    public FeriasResponse calcular(CreateFeriasRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        Funcionario func = funcionarioRepository.findById(request.getFuncionarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário", request.getFuncionarioId()));

        BigDecimal salario = func.getSalarioBase();
        int diasGozo = request.getDiasGozo() > 0 ? request.getDiasGozo() : 30;
        int diasAbono = request.isAbonoSolicitado() ? Math.min(request.getDiasAbono(), 10) : 0;

        // Cálculo férias CLT
        BigDecimal salarioDia = salario.divide(BigDecimal.valueOf(30), 4, RoundingMode.HALF_UP);
        BigDecimal valorFerias = salarioDia.multiply(BigDecimal.valueOf(diasGozo));
        BigDecimal valorTerco = valorFerias.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
        BigDecimal valorAbono = salarioDia.multiply(BigDecimal.valueOf(diasAbono));
        BigDecimal valorTercoAbono = valorAbono.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
        BigDecimal totalBruto = valorFerias.add(valorTerco).add(valorAbono).add(valorTercoAbono);

        // INSS progressivo 2024
        BigDecimal descontoInss = calcularInss(totalBruto);
        BigDecimal baseIrrf = totalBruto.subtract(descontoInss);
        BigDecimal descontoIrrf = calcularIrrf(baseIrrf);
        BigDecimal valorLiquido = totalBruto.subtract(descontoInss).subtract(descontoIrrf);

        LocalDate dataInicio = LocalDate.parse(request.getDataInicio());
        LocalDate dataFim = dataInicio.plusDays(diasGozo - 1);

        Ferias ferias = Ferias.builder()
                .funcionarioId(func.getId()).funcionarioNome(func.getNome())
                .dataInicio(dataInicio).dataFim(dataFim)
                .diasGozo(diasGozo).diasAbono(diasAbono).abonoSolicitado(request.isAbonoSolicitado())
                .valorFerias(valorFerias).valorTerco(valorTerco)
                .valorAbono(valorAbono).valorTercoAbono(valorTercoAbono)
                .totalBruto(totalBruto).descontoInss(descontoInss).descontoIrrf(descontoIrrf)
                .valorLiquido(valorLiquido)
                .status(StatusFerias.PROGRAMADA)
                .build();
        ferias.setTenantId(tenantId);
        ferias.setEmpresaId(empresaId);

        ferias = feriasRepository.save(ferias);
        log.info("Férias calculadas para {} - líquido: {} (tenant: {})", func.getNome(), valorLiquido, tenantId);
        return toResponse(ferias);
    }

    public FeriasResponse aprovar(String id) {
        Ferias ferias = feriasRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Férias", id));
        if (ferias.getStatus() != StatusFerias.PROGRAMADA) {
            throw new BusinessException("FERIAS_STATUS_INVALID", "Férias não estão programadas");
        }
        ferias.setStatus(StatusFerias.APROVADA);
        ferias = feriasRepository.save(ferias);
        return toResponse(ferias);
    }

    public List<FeriasResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return feriasRepository.findByTenantIdAndEmpresaId(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public FeriasResponse getById(String id) {
        return toResponse(feriasRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Férias", id)));
    }

    private BigDecimal calcularInss(BigDecimal base) {
        BigDecimal inss = BigDecimal.ZERO;
        BigDecimal restante = base;

        // Faixa 1: até 1.412,00 → 7,5%
        BigDecimal faixa1 = BigDecimal.valueOf(1412.00);
        if (restante.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal baseFaixa = restante.min(faixa1);
            inss = inss.add(baseFaixa.multiply(BigDecimal.valueOf(0.075)));
            restante = restante.subtract(faixa1).max(BigDecimal.ZERO);
        }
        // Faixa 2: 1.412,01 a 2.666,68 → 9%
        BigDecimal faixa2 = BigDecimal.valueOf(2666.68).subtract(faixa1);
        if (restante.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal baseFaixa = restante.min(faixa2);
            inss = inss.add(baseFaixa.multiply(BigDecimal.valueOf(0.09)));
            restante = restante.subtract(faixa2).max(BigDecimal.ZERO);
        }
        // Faixa 3: 2.666,69 a 4.000,03 → 12%
        BigDecimal faixa3 = BigDecimal.valueOf(4000.03).subtract(BigDecimal.valueOf(2666.68));
        if (restante.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal baseFaixa = restante.min(faixa3);
            inss = inss.add(baseFaixa.multiply(BigDecimal.valueOf(0.12)));
            restante = restante.subtract(faixa3).max(BigDecimal.ZERO);
        }
        // Faixa 4: 4.000,04 a 7.786,02 → 14%
        BigDecimal faixa4 = BigDecimal.valueOf(7786.02).subtract(BigDecimal.valueOf(4000.03));
        if (restante.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal baseFaixa = restante.min(faixa4);
            inss = inss.add(baseFaixa.multiply(BigDecimal.valueOf(0.14)));
        }
        return inss.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calcularIrrf(BigDecimal base) {
        if (base.compareTo(BigDecimal.valueOf(2259.20)) <= 0) return BigDecimal.ZERO;
        if (base.compareTo(BigDecimal.valueOf(2826.65)) <= 0)
            return base.multiply(BigDecimal.valueOf(0.075)).subtract(BigDecimal.valueOf(169.44)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        if (base.compareTo(BigDecimal.valueOf(3751.05)) <= 0)
            return base.multiply(BigDecimal.valueOf(0.15)).subtract(BigDecimal.valueOf(381.44)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        if (base.compareTo(BigDecimal.valueOf(4664.68)) <= 0)
            return base.multiply(BigDecimal.valueOf(0.225)).subtract(BigDecimal.valueOf(662.77)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        return base.multiply(BigDecimal.valueOf(0.275)).subtract(BigDecimal.valueOf(896.00)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private FeriasResponse toResponse(Ferias f) {
        return FeriasResponse.builder()
                .id(f.getId()).funcionarioId(f.getFuncionarioId()).funcionarioNome(f.getFuncionarioNome())
                .periodoAquisitivoInicio(f.getPeriodoAquisitivoInicio()).periodoAquisitivoFim(f.getPeriodoAquisitivoFim())
                .dataInicio(f.getDataInicio()).dataFim(f.getDataFim())
                .diasGozo(f.getDiasGozo()).diasAbono(f.getDiasAbono()).abonoSolicitado(f.isAbonoSolicitado())
                .valorFerias(f.getValorFerias()).valorTerco(f.getValorTerco())
                .valorAbono(f.getValorAbono()).valorTercoAbono(f.getValorTercoAbono())
                .totalBruto(f.getTotalBruto()).descontoInss(f.getDescontoInss()).descontoIrrf(f.getDescontoIrrf())
                .valorLiquido(f.getValorLiquido())
                .status(f.getStatus() != null ? f.getStatus().name() : null)
                .createdAt(f.getCreatedAt())
                .build();
    }
}
