package br.com.bearerp.financeiroservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.financeiroservice.application.dto.BaixarContaRequest;
import br.com.bearerp.financeiroservice.application.dto.ContaReceberResponse;
import br.com.bearerp.financeiroservice.application.dto.CreateContaReceberRequest;
import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import br.com.bearerp.financeiroservice.domain.model.ContaReceber;
import br.com.bearerp.financeiroservice.domain.model.MovimentoBancario;
import br.com.bearerp.financeiroservice.domain.repository.ContaBancariaRepository;
import br.com.bearerp.financeiroservice.domain.repository.ContaReceberRepository;
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
public class ContasReceberUseCase {
    private final ContaReceberRepository contaReceberRepository;
    private final ContaBancariaRepository contaBancariaRepository;
    private final MovimentoBancarioRepository movimentoRepository;

    public Page<ContaReceberResponse> listar(ContaPagar.StatusConta status, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        Page<ContaReceber> page = status != null
                ? contaReceberRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, status, pageable)
                : contaReceberRepository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable);
        return page.map(ContaReceberResponse::fromEntity);
    }

    public ContaReceberResponse buscarPorId(String id) {
        return contaReceberRepository.findById(id).map(ContaReceberResponse::fromEntity)
                .orElseThrow(() -> new RuntimeException("Conta a receber não encontrada"));
    }

    public ContaReceberResponse criar(CreateContaReceberRequest req) {
        if (req.getTotalParcelas() > 1) {
            return criarParcelamento(req);
        }
        ContaReceber conta = ContaReceber.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .numero(gerarNumero()).descricao(req.getDescricao())
                .clienteId(req.getClienteId()).clienteNome(req.getClienteNome()).clienteCnpjCpf(req.getClienteCnpjCpf())
                .categoriaId(req.getCategoriaId()).categoria(req.getCategoria()).centroCustoId(req.getCentroCustoId())
                .contaContabilId(req.getContaContabilId())
                .dataEmissao(req.getDataEmissao()).dataVencimento(req.getDataVencimento())
                .dataCompetencia(req.getDataCompetencia() != null ? req.getDataCompetencia() : req.getDataEmissao())
                .valorOriginal(req.getValorOriginal())
                .valorDesconto(req.getValorDesconto() != null ? req.getValorDesconto() : BigDecimal.ZERO)
                .valorJuros(BigDecimal.ZERO).valorMulta(BigDecimal.ZERO).valorRecebido(BigDecimal.ZERO)
                .formaRecebimento(req.getFormaRecebimento())
                .nfeId(req.getNfeId()).nfseId(req.getNfseId()).observacao(req.getObservacao())
                .parcela(1).totalParcelas(1)
                .status(ContaPagar.StatusConta.ABERTA).recorrente(req.isRecorrente())
                .baixas(new ArrayList<>())
                .build();
        return ContaReceberResponse.fromEntity(contaReceberRepository.save(conta));
    }

    private ContaReceberResponse criarParcelamento(CreateContaReceberRequest req) {
        String parcelamentoId = UUID.randomUUID().toString();
        BigDecimal valorParcela = req.getValorOriginal().divide(BigDecimal.valueOf(req.getTotalParcelas()), 2, java.math.RoundingMode.HALF_UP);
        ContaReceber primeira = null;
        for (int i = 1; i <= req.getTotalParcelas(); i++) {
            ContaReceber conta = ContaReceber.builder()
                    .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                    .numero(gerarNumero()).descricao(req.getDescricao() + " - Parcela " + i + "/" + req.getTotalParcelas())
                    .clienteId(req.getClienteId()).clienteNome(req.getClienteNome()).clienteCnpjCpf(req.getClienteCnpjCpf())
                    .categoriaId(req.getCategoriaId()).categoria(req.getCategoria()).centroCustoId(req.getCentroCustoId())
                    .contaContabilId(req.getContaContabilId())
                    .dataEmissao(req.getDataEmissao())
                    .dataVencimento(req.getDataVencimento().plusMonths(i - 1))
                    .dataCompetencia(req.getDataCompetencia() != null ? req.getDataCompetencia().plusMonths(i - 1) : req.getDataEmissao().plusMonths(i - 1))
                    .valorOriginal(valorParcela)
                    .valorDesconto(BigDecimal.ZERO).valorJuros(BigDecimal.ZERO).valorMulta(BigDecimal.ZERO).valorRecebido(BigDecimal.ZERO)
                    .formaRecebimento(req.getFormaRecebimento())
                    .parcela(i).totalParcelas(req.getTotalParcelas()).parcelamentoId(parcelamentoId)
                    .status(ContaPagar.StatusConta.ABERTA).recorrente(req.isRecorrente())
                    .baixas(new ArrayList<>())
                    .build();
            ContaReceber saved = contaReceberRepository.save(conta);
            if (i == 1) primeira = saved;
        }
        return ContaReceberResponse.fromEntity(primeira);
    }

    public ContaReceberResponse baixar(String id, BaixarContaRequest req) {
        ContaReceber conta = contaReceberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conta a receber não encontrada"));

        ContaPagar.Baixa baixa = ContaPagar.Baixa.builder()
                .data(req.getData()).valor(req.getValor())
                .formaPagamento(req.getFormaPagamento())
                .contaBancariaId(req.getContaBancariaId())
                .observacao(req.getObservacao()).build();

        if (conta.getBaixas() == null) conta.setBaixas(new ArrayList<>());
        conta.getBaixas().add(baixa);

        BigDecimal totalRecebido = conta.getBaixas().stream().map(ContaPagar.Baixa::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
        conta.setValorRecebido(totalRecebido);

        BigDecimal valorLiquido = conta.getValorOriginal()
                .subtract(conta.getValorDesconto())
                .add(conta.getValorJuros())
                .add(conta.getValorMulta());

        if (totalRecebido.compareTo(valorLiquido) >= 0) {
            conta.setStatus(ContaPagar.StatusConta.PAGA);
            conta.setDataRecebimento(req.getData());
        } else {
            conta.setStatus(ContaPagar.StatusConta.PARCIAL);
        }

        // Registrar movimento bancário (crédito)
        if (req.getContaBancariaId() != null) {
            registrarMovimentoCredito(req.getContaBancariaId(), req.getData(), req.getValor(),
                    "Receb: " + conta.getDescricao(), null, conta.getId());
        }

        return ContaReceberResponse.fromEntity(contaReceberRepository.save(conta));
    }

    public void cancelar(String id) {
        ContaReceber conta = contaReceberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conta a receber não encontrada"));
        conta.setStatus(ContaPagar.StatusConta.CANCELADA);
        contaReceberRepository.save(conta);
    }

    public List<ContaReceberResponse> listarVencidas() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        List<ContaReceber> vencidas = contaReceberRepository
                .findByTenantIdAndEmpresaIdAndStatusAndDataVencimentoLessThanEqual(
                        tenantId, empresaId, ContaPagar.StatusConta.ABERTA, LocalDate.now());
        vencidas.forEach(c -> {
            c.setStatus(ContaPagar.StatusConta.VENCIDA);
            contaReceberRepository.save(c);
        });
        return vencidas.stream().map(ContaReceberResponse::fromEntity).toList();
    }

    private void registrarMovimentoCredito(String contaBancariaId, LocalDate data, BigDecimal valor, String descricao, String contaPagarId, String contaReceberId) {
        contaBancariaRepository.findById(contaBancariaId).ifPresent(cb -> {
            BigDecimal novoSaldo = cb.getSaldoAtual().add(valor);
            cb.setSaldoAtual(novoSaldo);
            cb.setSaldoDisponivel(novoSaldo);
            contaBancariaRepository.save(cb);

            MovimentoBancario mov = MovimentoBancario.builder()
                    .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                    .contaBancariaId(contaBancariaId).data(data)
                    .tipo(MovimentoBancario.TipoMovimento.CREDITO)
                    .descricao(descricao).valor(valor).saldoApos(novoSaldo)
                    .contaPagarId(contaPagarId).contaReceberId(contaReceberId)
                    .conciliado(false).build();
            movimentoRepository.save(mov);
        });
    }

    private String gerarNumero() {
        return "CR-" + System.currentTimeMillis();
    }
}
