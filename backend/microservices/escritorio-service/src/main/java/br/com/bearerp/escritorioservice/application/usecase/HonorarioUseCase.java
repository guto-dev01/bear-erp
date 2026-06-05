package br.com.bearerp.escritorioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.escritorioservice.domain.model.Honorario;
import br.com.bearerp.escritorioservice.domain.repository.HonorarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor
public class HonorarioUseCase {
    private final HonorarioRepository repository;

    public Page<Honorario> listar(Pageable pageable) {
        return repository.findByTenantIdAndEmpresaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), pageable);
    }

    public Honorario criar(Honorario honorario) {
        honorario.setTenantId(TenantContext.getTenantId());
        honorario.setEmpresaId(TenantContext.getEmpresaId());
        BigDecimal extras = honorario.getValorServicosExtras() != null ? honorario.getValorServicosExtras() : BigDecimal.ZERO;
        BigDecimal desconto = honorario.getValorDesconto() != null ? honorario.getValorDesconto() : BigDecimal.ZERO;
        honorario.setValorTotal(honorario.getValorHonorario().add(extras).subtract(desconto));
        honorario.setStatus(Honorario.StatusHonorario.ABERTO);
        return repository.save(honorario);
    }

    public Honorario registrarPagamento(String id) {
        Honorario honorario = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Honorário não encontrado"));
        honorario.setStatus(Honorario.StatusHonorario.PAGO);
        honorario.setDataPagamento(LocalDate.now());
        return repository.save(honorario);
    }

    public List<Honorario> listarVencidos() {
        List<Honorario> abertos = repository.findByTenantIdAndEmpresaIdAndStatus(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), Honorario.StatusHonorario.ABERTO);
        abertos.stream()
                .filter(h -> h.getDataVencimento() != null && h.getDataVencimento().isBefore(LocalDate.now()))
                .forEach(h -> {
                    h.setStatus(Honorario.StatusHonorario.VENCIDO);
                    repository.save(h);
                });
        return repository.findByTenantIdAndEmpresaIdAndStatus(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), Honorario.StatusHonorario.VENCIDO);
    }

    public List<Honorario> listarPorCliente(String clienteEmpresaId) {
        return repository.findByTenantIdAndEmpresaIdAndClienteEmpresaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), clienteEmpresaId);
    }
}
