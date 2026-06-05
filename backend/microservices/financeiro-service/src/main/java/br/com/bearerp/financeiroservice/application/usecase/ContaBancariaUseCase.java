package br.com.bearerp.financeiroservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.financeiroservice.application.dto.ContaBancariaResponse;
import br.com.bearerp.financeiroservice.application.dto.CreateContaBancariaRequest;
import br.com.bearerp.financeiroservice.application.dto.MovimentoBancarioResponse;
import br.com.bearerp.financeiroservice.domain.model.ContaBancaria;
import br.com.bearerp.financeiroservice.domain.repository.ContaBancariaRepository;
import br.com.bearerp.financeiroservice.domain.repository.MovimentoBancarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service @RequiredArgsConstructor
public class ContaBancariaUseCase {
    private final ContaBancariaRepository contaBancariaRepository;
    private final MovimentoBancarioRepository movimentoRepository;

    public List<ContaBancariaResponse> listar() {
        return contaBancariaRepository.findByTenantIdAndEmpresaIdAndAtiva(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), true)
                .stream().map(ContaBancariaResponse::fromEntity).toList();
    }

    public List<ContaBancariaResponse> listarTodas() {
        return contaBancariaRepository.findByTenantIdAndEmpresaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId())
                .stream().map(ContaBancariaResponse::fromEntity).toList();
    }

    public ContaBancariaResponse buscarPorId(String id) {
        return contaBancariaRepository.findById(id).map(ContaBancariaResponse::fromEntity)
                .orElseThrow(() -> new RuntimeException("Conta bancária não encontrada"));
    }

    public ContaBancariaResponse criar(CreateContaBancariaRequest req) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (req.isPrincipal()) {
            contaBancariaRepository.findByTenantIdAndEmpresaIdAndPrincipal(tenantId, empresaId, true)
                    .ifPresent(cb -> { cb.setPrincipal(false); contaBancariaRepository.save(cb); });
        }

        ContaBancaria conta = ContaBancaria.builder()
                .tenantId(tenantId).empresaId(empresaId)
                .banco(req.getBanco()).codigoBanco(req.getCodigoBanco())
                .agencia(req.getAgencia()).conta(req.getConta()).digito(req.getDigito())
                .tipoConta(req.getTipoConta()).descricao(req.getDescricao())
                .saldoAtual(req.getSaldoAtual() != null ? req.getSaldoAtual() : BigDecimal.ZERO)
                .saldoDisponivel(req.getSaldoAtual() != null ? req.getSaldoAtual() : BigDecimal.ZERO)
                .contaContabilId(req.getContaContabilId())
                .ativa(true).principal(req.isPrincipal())
                .build();
        return ContaBancariaResponse.fromEntity(contaBancariaRepository.save(conta));
    }

    public ContaBancariaResponse atualizar(String id, CreateContaBancariaRequest req) {
        ContaBancaria conta = contaBancariaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conta bancária não encontrada"));
        conta.setBanco(req.getBanco());
        conta.setCodigoBanco(req.getCodigoBanco());
        conta.setAgencia(req.getAgencia());
        conta.setConta(req.getConta());
        conta.setDigito(req.getDigito());
        conta.setTipoConta(req.getTipoConta());
        conta.setDescricao(req.getDescricao());
        conta.setContaContabilId(req.getContaContabilId());
        if (req.isPrincipal() && !conta.isPrincipal()) {
            contaBancariaRepository.findByTenantIdAndEmpresaIdAndPrincipal(
                    conta.getTenantId(), conta.getEmpresaId(), true)
                    .ifPresent(cb -> { cb.setPrincipal(false); contaBancariaRepository.save(cb); });
        }
        conta.setPrincipal(req.isPrincipal());
        return ContaBancariaResponse.fromEntity(contaBancariaRepository.save(conta));
    }

    public void desativar(String id) {
        ContaBancaria conta = contaBancariaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conta bancária não encontrada"));
        conta.setAtiva(false);
        contaBancariaRepository.save(conta);
    }

    public Page<MovimentoBancarioResponse> listarMovimentos(String contaBancariaId, Pageable pageable) {
        return movimentoRepository.findByTenantIdAndEmpresaIdAndContaBancariaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), contaBancariaId, pageable)
                .map(MovimentoBancarioResponse::fromEntity);
    }
}
