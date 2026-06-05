package br.com.bearerp.financeiroservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.financeiroservice.application.dto.MovimentoBancarioResponse;
import br.com.bearerp.financeiroservice.domain.model.MovimentoBancario;
import br.com.bearerp.financeiroservice.domain.repository.MovimentoBancarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ConciliacaoUseCase {
    private final MovimentoBancarioRepository movimentoRepository;

    public List<MovimentoBancarioResponse> listarNaoConciliados(String contaBancariaId) {
        return movimentoRepository.findByTenantIdAndEmpresaIdAndContaBancariaIdAndConciliado(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), contaBancariaId, false)
                .stream().map(MovimentoBancarioResponse::fromEntity).toList();
    }

    public List<MovimentoBancarioResponse> listarPorPeriodo(String contaBancariaId, LocalDate inicio, LocalDate fim) {
        return movimentoRepository.findByTenantIdAndEmpresaIdAndContaBancariaIdAndDataBetween(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), contaBancariaId, inicio, fim)
                .stream().map(MovimentoBancarioResponse::fromEntity).toList();
    }

    public void conciliar(List<String> movimentoIds) {
        String conciliacaoId = UUID.randomUUID().toString();
        for (String id : movimentoIds) {
            movimentoRepository.findById(id).ifPresent(mov -> {
                mov.setConciliado(true);
                mov.setConciliacaoId(conciliacaoId);
                movimentoRepository.save(mov);
            });
        }
    }

    public void desconciliar(String movimentoId) {
        movimentoRepository.findById(movimentoId).ifPresent(mov -> {
            mov.setConciliado(false);
            mov.setConciliacaoId(null);
            movimentoRepository.save(mov);
        });
    }
}
