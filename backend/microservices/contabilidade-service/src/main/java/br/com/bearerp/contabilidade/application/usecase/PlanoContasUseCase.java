package br.com.bearerp.contabilidade.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.contabilidade.application.dto.*;
import br.com.bearerp.contabilidade.domain.model.PlanoContas;
import br.com.bearerp.contabilidade.domain.model.PlanoContas.*;
import br.com.bearerp.contabilidade.domain.repository.LancamentoContabilRepository;
import br.com.bearerp.contabilidade.domain.repository.PlanoContasRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanoContasUseCase {

    private final PlanoContasRepository planoContasRepository;
    private final LancamentoContabilRepository lancamentoRepository;

    public PlanoContasResponse createConta(CreatePlanoContasRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (planoContasRepository.existsByTenantIdAndEmpresaIdAndCodigo(tenantId, empresaId, request.getCodigo())) {
            throw new BusinessException("CONTA_EXISTS", "Já existe uma conta com o código " + request.getCodigo());
        }

        int nivel = request.getCodigo().split("\\.").length;

        if (request.getContaPaiId() != null) {
            planoContasRepository.findById(request.getContaPaiId())
                    .orElseThrow(() -> new ResourceNotFoundException("Conta pai", request.getContaPaiId()));
        }

        PlanoContas conta = PlanoContas.builder()
                .codigo(request.getCodigo())
                .descricao(request.getDescricao())
                .natureza(Natureza.valueOf(request.getNatureza()))
                .tipo(TipoConta.valueOf(request.getTipo()))
                .classificacao(Classificacao.valueOf(request.getClassificacao()))
                .nivel(nivel)
                .contaPaiId(request.getContaPaiId())
                .aceitaLancamento(request.isAceitaLancamento())
                .contaReferencial(request.getContaReferencial())
                .status(StatusConta.ATIVA)
                .ordem(0)
                .build();
        conta.setTenantId(tenantId);
        conta.setEmpresaId(empresaId);

        conta = planoContasRepository.save(conta);
        log.info("Conta criada: {} - {} (tenant: {})", conta.getCodigo(), conta.getDescricao(), tenantId);
        return toResponse(conta);
    }

    public PlanoContasResponse updateConta(String id, UpdatePlanoContasRequest request) {
        PlanoContas conta = planoContasRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conta", id));

        if (request.getDescricao() != null) conta.setDescricao(request.getDescricao());
        if (request.getContaReferencial() != null) conta.setContaReferencial(request.getContaReferencial());
        if (request.getAceitaLancamento() != null) conta.setAceitaLancamento(request.getAceitaLancamento());
        if (request.getStatus() != null) conta.setStatus(StatusConta.valueOf(request.getStatus()));

        conta = planoContasRepository.save(conta);
        return toResponse(conta);
    }

    public PlanoContasResponse getConta(String id) {
        return toResponse(planoContasRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conta", id)));
    }

    public List<PlanoContasResponse> listContas() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return planoContasRepository.findByTenantIdAndEmpresaIdOrderByCodigoAsc(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public List<PlanoContasResponse> listContasByClassificacao(String classificacao) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return planoContasRepository.findByTenantIdAndEmpresaIdAndClassificacao(tenantId, empresaId, Classificacao.valueOf(classificacao))
                .stream().map(this::toResponse).toList();
    }

    public List<PlanoContasResponse> listContasAnaliticas() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return planoContasRepository.findByTenantIdAndEmpresaIdAndAceitaLancamentoAndStatus(tenantId, empresaId, true, StatusConta.ATIVA)
                .stream().map(this::toResponse).toList();
    }

    public List<PlanoContasResponse> getArvoreContas() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        List<PlanoContas> todas = planoContasRepository.findByTenantIdAndEmpresaIdOrderByCodigoAsc(tenantId, empresaId);

        Map<String, List<PlanoContas>> filhosPorPai = todas.stream()
                .filter(c -> c.getContaPaiId() != null)
                .collect(Collectors.groupingBy(PlanoContas::getContaPaiId));

        return todas.stream()
                .filter(c -> c.getContaPaiId() == null)
                .map(c -> toResponseComFilhos(c, filhosPorPai))
                .toList();
    }

    public List<PlanoContasResponse> importPlanoReferencial() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        List<PlanoContas> existentes = planoContasRepository.findByTenantIdAndEmpresaId(tenantId, empresaId);
        if (!existentes.isEmpty()) {
            throw new BusinessException("PLANO_EXISTS", "Já existe plano de contas para esta empresa. Exclua antes de importar.");
        }

        List<PlanoContas> contas = new ArrayList<>();
        // 1 - ATIVO
        contas.add(buildConta(tenantId, empresaId, "1", "ATIVO", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1", "ATIVO CIRCULANTE", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.01", "Caixa e Equivalentes de Caixa", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.01.001", "Caixa Geral", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.01.002", "Caixa Pequenas Despesas", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.02", "Bancos Conta Movimento", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.02.001", "Banco do Brasil", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.02.002", "Itaú", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.02.003", "Bradesco", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.03", "Aplicações Financeiras", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.03.001", "Aplicações de Liquidez Imediata", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.04", "Clientes", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.04.001", "Duplicatas a Receber", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.04.002", "(-) Provisão para Devedores Duvidosos", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.05", "Estoques", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.05.001", "Mercadorias para Revenda", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.05.002", "Matéria-Prima", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.06", "Impostos a Recuperar", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.06.001", "ICMS a Recuperar", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.06.002", "PIS a Recuperar", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.06.003", "COFINS a Recuperar", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.06.004", "IPI a Recuperar", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.06.005", "IRRF a Recuperar", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.07", "Adiantamentos", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.07.001", "Adiantamento a Fornecedores", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.1.07.002", "Adiantamento a Funcionários", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2", "ATIVO NÃO CIRCULANTE", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.01", "Realizável a Longo Prazo", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.01.001", "Depósitos Judiciais", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.02", "Investimentos", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.02.001", "Participações Societárias", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.03", "Imobilizado", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.03.001", "Máquinas e Equipamentos", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.03.002", "Veículos", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.03.003", "Móveis e Utensílios", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.03.004", "Computadores e Periféricos", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.03.005", "(-) Depreciação Acumulada", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.04", "Intangível", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.04.001", "Softwares e Licenças", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));
        contas.add(buildConta(tenantId, empresaId, "1.2.04.002", "(-) Amortização Acumulada", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.ATIVO, null));

        // 2 - PASSIVO
        contas.add(buildConta(tenantId, empresaId, "2", "PASSIVO", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1", "PASSIVO CIRCULANTE", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.01", "Fornecedores", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.01.001", "Fornecedores Nacionais", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.02", "Empréstimos e Financiamentos CP", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.02.001", "Empréstimos Bancários", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.03", "Obrigações Trabalhistas", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.03.001", "Salários a Pagar", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.03.002", "FGTS a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.03.003", "INSS a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.03.004", "IRRF a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.03.005", "Férias a Pagar", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.03.006", "13º Salário a Pagar", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.04", "Obrigações Tributárias", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.04.001", "ICMS a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.04.002", "PIS a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.04.003", "COFINS a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.04.004", "ISS a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.04.005", "IRPJ a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.04.006", "CSLL a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.04.007", "Simples Nacional a Recolher", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.05", "Outras Obrigações", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.1.05.001", "Contas a Pagar Diversas", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.2", "PASSIVO NÃO CIRCULANTE", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.2.01", "Empréstimos e Financiamentos LP", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.2.01.001", "Financiamentos Bancários LP", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.2.02", "Provisões", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PASSIVO, null));
        contas.add(buildConta(tenantId, empresaId, "2.2.02.001", "Provisão para Contingências", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PASSIVO, null));

        // 3 - PATRIMÔNIO LÍQUIDO
        contas.add(buildConta(tenantId, empresaId, "3", "PATRIMÔNIO LÍQUIDO", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.1", "Capital Social", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.1.01", "Capital Social Subscrito", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.1.02", "(-) Capital Social a Integralizar", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.2", "Reservas de Capital", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.2.01", "Ágio na Emissão de Ações", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.3", "Reservas de Lucros", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.3.01", "Reserva Legal", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.3.02", "Reserva Estatutária", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.3.03", "Lucros Acumulados", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.4", "Ajustes de Avaliação Patrimonial", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.4.01", "Ajustes de Avaliação Patrimonial", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.5", "Prejuízos Acumulados", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.PATRIMONIO_LIQUIDO, null));
        contas.add(buildConta(tenantId, empresaId, "3.5.01", "Prejuízos Acumulados", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.PATRIMONIO_LIQUIDO, null));

        // 4 - RECEITAS
        contas.add(buildConta(tenantId, empresaId, "4", "RECEITAS", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.1", "RECEITA BRUTA", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.1.01", "Receita de Vendas", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.1.01.001", "Vendas de Mercadorias", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.1.01.002", "Vendas de Produtos", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.1.02", "Receita de Serviços", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.1.02.001", "Prestação de Serviços", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.2", "DEDUÇÕES DA RECEITA", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.2.01", "Devoluções de Vendas", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.2.02", "Abatimentos sobre Vendas", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.2.03", "ICMS sobre Vendas", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.2.04", "PIS sobre Faturamento", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.2.05", "COFINS sobre Faturamento", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));
        contas.add(buildConta(tenantId, empresaId, "4.2.06", "ISS sobre Serviços", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.RECEITA, null));

        // 5 - CUSTOS
        contas.add(buildConta(tenantId, empresaId, "5", "CUSTOS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.CUSTO, null));
        contas.add(buildConta(tenantId, empresaId, "5.1", "CUSTO DAS MERCADORIAS VENDIDAS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.CUSTO, null));
        contas.add(buildConta(tenantId, empresaId, "5.1.01", "CMV - Custo das Mercadorias Vendidas", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.CUSTO, null));
        contas.add(buildConta(tenantId, empresaId, "5.2", "CUSTO DOS SERVIÇOS PRESTADOS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.CUSTO, null));
        contas.add(buildConta(tenantId, empresaId, "5.2.01", "CSP - Custo dos Serviços Prestados", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.CUSTO, null));

        // 6 - DESPESAS
        contas.add(buildConta(tenantId, empresaId, "6", "DESPESAS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1", "DESPESAS ADMINISTRATIVAS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.01", "Salários e Ordenados", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.02", "Encargos Sociais", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.03", "Férias e 13º Salário", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.04", "Aluguel", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.05", "Energia Elétrica", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.06", "Água e Esgoto", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.07", "Telefone e Internet", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.08", "Material de Escritório", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.09", "Depreciação e Amortização", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.10", "Honorários Contábeis", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.11", "Serviços de Terceiros", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.12", "Seguros", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.1.13", "Manutenção e Reparos", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.2", "DESPESAS COMERCIAIS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.2.01", "Comissões sobre Vendas", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.2.02", "Propaganda e Publicidade", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.2.03", "Fretes sobre Vendas", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.3", "DESPESAS FINANCEIRAS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.3.01", "Juros Pagos", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.3.02", "Descontos Concedidos", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.3.03", "Tarifas Bancárias", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.3.04", "IOF", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.4", "RECEITAS FINANCEIRAS", Natureza.CREDORA, TipoConta.SINTETICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.4.01", "Juros Recebidos", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.4.02", "Descontos Obtidos", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.4.03", "Rendimentos de Aplicações", Natureza.CREDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.5", "DESPESAS TRIBUTÁRIAS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.5.01", "IRPJ", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.5.02", "CSLL", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.5.03", "Multas Fiscais", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.6", "OUTRAS DESPESAS", Natureza.DEVEDORA, TipoConta.SINTETICA, Classificacao.DESPESA, null));
        contas.add(buildConta(tenantId, empresaId, "6.6.01", "Perdas Diversas", Natureza.DEVEDORA, TipoConta.ANALITICA, Classificacao.DESPESA, null));

        // Vincula contaPaiId
        Map<String, String> codigoParaId = new HashMap<>();
        List<PlanoContas> salvas = new ArrayList<>();
        for (PlanoContas c : contas) {
            c = planoContasRepository.save(c);
            codigoParaId.put(c.getCodigo(), c.getId());
            salvas.add(c);
        }

        // Atualiza contaPaiId
        for (PlanoContas c : salvas) {
            String codigoPai = getCodigoPai(c.getCodigo());
            if (codigoPai != null && codigoParaId.containsKey(codigoPai)) {
                c.setContaPaiId(codigoParaId.get(codigoPai));
                planoContasRepository.save(c);
            }
        }

        log.info("Plano referencial importado com {} contas (tenant: {}, empresa: {})", salvas.size(), tenantId, empresaId);
        return salvas.stream().map(this::toResponse).toList();
    }

    public void deleteConta(String id) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        PlanoContas conta = planoContasRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conta", id));

        if (lancamentoRepository.existsByTenantIdAndEmpresaIdAndPartidasContaId(tenantId, empresaId, id)) {
            throw new BusinessException("CONTA_COM_LANCAMENTO", "Não é possível excluir conta com lançamentos");
        }

        planoContasRepository.delete(conta);
    }

    private PlanoContas buildConta(String tenantId, String empresaId, String codigo, String descricao,
                                    Natureza natureza, TipoConta tipo, Classificacao classificacao, String contaPaiId) {
        PlanoContas c = PlanoContas.builder()
                .codigo(codigo)
                .descricao(descricao)
                .natureza(natureza)
                .tipo(tipo)
                .classificacao(classificacao)
                .nivel(codigo.split("\\.").length)
                .contaPaiId(contaPaiId)
                .aceitaLancamento(tipo == TipoConta.ANALITICA)
                .status(StatusConta.ATIVA)
                .ordem(0)
                .build();
        c.setTenantId(tenantId);
        c.setEmpresaId(empresaId);
        return c;
    }

    private String getCodigoPai(String codigo) {
        int lastDot = codigo.lastIndexOf('.');
        return lastDot > 0 ? codigo.substring(0, lastDot) : null;
    }

    private PlanoContasResponse toResponse(PlanoContas c) {
        return PlanoContasResponse.builder()
                .id(c.getId())
                .codigo(c.getCodigo())
                .descricao(c.getDescricao())
                .natureza(c.getNatureza().name())
                .tipo(c.getTipo().name())
                .classificacao(c.getClassificacao().name())
                .nivel(c.getNivel())
                .contaPaiId(c.getContaPaiId())
                .aceitaLancamento(c.isAceitaLancamento())
                .contaReferencial(c.getContaReferencial())
                .status(c.getStatus().name())
                .createdAt(c.getCreatedAt())
                .build();
    }

    private PlanoContasResponse toResponseComFilhos(PlanoContas conta, Map<String, List<PlanoContas>> filhosPorPai) {
        PlanoContasResponse response = toResponse(conta);
        List<PlanoContas> filhos = filhosPorPai.get(conta.getId());
        if (filhos != null) {
            response.setFilhos(filhos.stream()
                    .map(f -> toResponseComFilhos(f, filhosPorPai))
                    .toList());
        }
        return response;
    }
}
