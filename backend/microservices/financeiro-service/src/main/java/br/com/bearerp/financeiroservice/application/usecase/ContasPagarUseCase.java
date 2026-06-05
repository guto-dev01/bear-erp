package br.com.bearerp.financeiroservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.financeiroservice.application.dto.BaixarContaRequest;
import br.com.bearerp.financeiroservice.application.dto.ContaPagarResponse;
import br.com.bearerp.financeiroservice.application.dto.CreateContaPagarRequest;
import br.com.bearerp.financeiroservice.domain.model.ContaBancaria;
import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import br.com.bearerp.financeiroservice.domain.model.MovimentoBancario;
import br.com.bearerp.financeiroservice.domain.repository.ContaBancariaRepository;
import br.com.bearerp.financeiroservice.domain.repository.ContaPagarRepository;
import br.com.bearerp.financeiroservice.domain.repository.MovimentoBancarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ContasPagarUseCase {
    private final ContaPagarRepository contaPagarRepository;
    private final ContaBancariaRepository contaBancariaRepository;
    private final MovimentoBancarioRepository movimentoRepository;

    public Page<ContaPagarResponse> listar(ContaPagar.StatusConta status, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        Page<ContaPagar> page = status != null
                ? contaPagarRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, status, pageable)
                : contaPagarRepository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable);
        return page.map(ContaPagarResponse::fromEntity);
    }

    public ContaPagarResponse buscarPorId(String id) {
        return contaPagarRepository.findById(id).map(ContaPagarResponse::fromEntity)
                .orElseThrow(() -> new RuntimeException("Conta a pagar não encontrada"));
    }

    public ContaPagarResponse criar(CreateContaPagarRequest req) {
        if (req.getTotalParcelas() > 1) {
            return criarParcelamento(req);
        }
        ContaPagar conta = ContaPagar.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .numero(gerarNumero()).descricao(req.getDescricao())
                .fornecedorId(req.getFornecedorId()).fornecedorNome(req.getFornecedorNome()).fornecedorCnpjCpf(req.getFornecedorCnpjCpf())
                .categoriaId(req.getCategoriaId()).categoria(req.getCategoria()).centroCustoId(req.getCentroCustoId())
                .contaContabilId(req.getContaContabilId())
                .dataEmissao(req.getDataEmissao()).dataVencimento(req.getDataVencimento())
                .dataCompetencia(req.getDataCompetencia() != null ? req.getDataCompetencia() : req.getDataEmissao())
                .valorOriginal(req.getValorOriginal())
                .valorDesconto(req.getValorDesconto() != null ? req.getValorDesconto() : BigDecimal.ZERO)
                .valorJuros(BigDecimal.ZERO).valorMulta(BigDecimal.ZERO).valorPago(BigDecimal.ZERO)
                .formaPagamento(req.getFormaPagamento()).codigoBarras(req.getCodigoBarras())
                .nfeId(req.getNfeId()).observacao(req.getObservacao())
                .parcela(1).totalParcelas(1)
                .status(ContaPagar.StatusConta.ABERTA).recorrente(req.isRecorrente())
                .baixas(new ArrayList<>())
                .build();
        return ContaPagarResponse.fromEntity(contaPagarRepository.save(conta));
    }

    private ContaPagarResponse criarParcelamento(CreateContaPagarRequest req) {
        String parcelamentoId = UUID.randomUUID().toString();
        BigDecimal valorParcela = req.getValorOriginal().divide(BigDecimal.valueOf(req.getTotalParcelas()), 2, java.math.RoundingMode.HALF_UP);
        ContaPagar primeira = null;
        for (int i = 1; i <= req.getTotalParcelas(); i++) {
            ContaPagar conta = ContaPagar.builder()
                    .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                    .numero(gerarNumero()).descricao(req.getDescricao() + " - Parcela " + i + "/" + req.getTotalParcelas())
                    .fornecedorId(req.getFornecedorId()).fornecedorNome(req.getFornecedorNome()).fornecedorCnpjCpf(req.getFornecedorCnpjCpf())
                    .categoriaId(req.getCategoriaId()).categoria(req.getCategoria()).centroCustoId(req.getCentroCustoId())
                    .contaContabilId(req.getContaContabilId())
                    .dataEmissao(req.getDataEmissao())
                    .dataVencimento(req.getDataVencimento().plusMonths(i - 1))
                    .dataCompetencia(req.getDataCompetencia() != null ? req.getDataCompetencia().plusMonths(i - 1) : req.getDataEmissao().plusMonths(i - 1))
                    .valorOriginal(valorParcela)
                    .valorDesconto(BigDecimal.ZERO).valorJuros(BigDecimal.ZERO).valorMulta(BigDecimal.ZERO).valorPago(BigDecimal.ZERO)
                    .formaPagamento(req.getFormaPagamento())
                    .parcela(i).totalParcelas(req.getTotalParcelas()).parcelamentoId(parcelamentoId)
                    .status(ContaPagar.StatusConta.ABERTA).recorrente(req.isRecorrente())
                    .baixas(new ArrayList<>())
                    .build();
            ContaPagar saved = contaPagarRepository.save(conta);
            if (i == 1) primeira = saved;
        }
        return ContaPagarResponse.fromEntity(primeira);
    }

    public ContaPagarResponse baixar(String id, BaixarContaRequest req) {
        ContaPagar conta = contaPagarRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conta a pagar não encontrada"));

        ContaPagar.Baixa baixa = ContaPagar.Baixa.builder()
                .data(req.getData()).valor(req.getValor())
                .formaPagamento(req.getFormaPagamento())
                .contaBancariaId(req.getContaBancariaId())
                .observacao(req.getObservacao()).build();

        if (conta.getBaixas() == null) conta.setBaixas(new ArrayList<>());
        conta.getBaixas().add(baixa);

        BigDecimal totalPago = conta.getBaixas().stream().map(ContaPagar.Baixa::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
        conta.setValorPago(totalPago);

        BigDecimal valorLiquido = conta.getValorOriginal()
                .subtract(conta.getValorDesconto())
                .add(conta.getValorJuros())
                .add(conta.getValorMulta());

        if (totalPago.compareTo(valorLiquido) >= 0) {
            conta.setStatus(ContaPagar.StatusConta.PAGA);
            conta.setDataPagamento(req.getData());
        } else {
            conta.setStatus(ContaPagar.StatusConta.PARCIAL);
        }

        // Registrar movimento bancário
        if (req.getContaBancariaId() != null) {
            registrarMovimentoDebito(req.getContaBancariaId(), req.getData(), req.getValor(),
                    "Pgto: " + conta.getDescricao(), conta.getId(), null);
        }

        return ContaPagarResponse.fromEntity(contaPagarRepository.save(conta));
    }

    public void cancelar(String id) {
        ContaPagar conta = contaPagarRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conta a pagar não encontrada"));
        conta.setStatus(ContaPagar.StatusConta.CANCELADA);
        contaPagarRepository.save(conta);
    }

    public List<ContaPagarResponse> listarVencidas() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        List<ContaPagar> vencidas = contaPagarRepository
                .findByTenantIdAndEmpresaIdAndStatusAndDataVencimentoLessThanEqual(
                        tenantId, empresaId, ContaPagar.StatusConta.ABERTA, LocalDate.now());
        vencidas.forEach(c -> {
            c.setStatus(ContaPagar.StatusConta.VENCIDA);
            contaPagarRepository.save(c);
        });
        return vencidas.stream().map(ContaPagarResponse::fromEntity).toList();
    }

    private void registrarMovimentoDebito(String contaBancariaId, LocalDate data, BigDecimal valor, String descricao, String contaPagarId, String contaReceberId) {
        contaBancariaRepository.findById(contaBancariaId).ifPresent(cb -> {
            BigDecimal novoSaldo = cb.getSaldoAtual().subtract(valor);
            cb.setSaldoAtual(novoSaldo);
            cb.setSaldoDisponivel(novoSaldo);
            contaBancariaRepository.save(cb);

            MovimentoBancario mov = MovimentoBancario.builder()
                    .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                    .contaBancariaId(contaBancariaId).data(data)
                    .tipo(MovimentoBancario.TipoMovimento.DEBITO)
                    .descricao(descricao).valor(valor).saldoApos(novoSaldo)
                    .contaPagarId(contaPagarId).contaReceberId(contaReceberId)
                    .conciliado(false).build();
            movimentoRepository.save(mov);
        });
    }

    private String gerarNumero() {
        return "CP-" + System.currentTimeMillis();
    }
}
