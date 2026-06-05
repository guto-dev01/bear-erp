package br.com.bearerp.nfseservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.nfseservice.application.dto.CreateNfseRequest;
import br.com.bearerp.nfseservice.application.dto.NfseResponse;
import br.com.bearerp.nfseservice.domain.model.NotaFiscalServico;
import br.com.bearerp.nfseservice.domain.model.NotaFiscalServico.*;
import br.com.bearerp.nfseservice.domain.repository.NfseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NfseUseCase {

    private final NfseRepository nfseRepository;

    public NfseResponse criarNfse(CreateNfseRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        // Gerar número sequencial
        Long numero = nfseRepository.findTopByTenantIdAndEmpresaIdOrderByNumeroDesc(tenantId, empresaId)
                .map(n -> n.getNumero() + 1).orElse(1L);

        // Calcular valores
        BigDecimal valorDeducoes = request.getValorDeducoes() != null ? request.getValorDeducoes() : BigDecimal.ZERO;
        BigDecimal descontoInc = request.getDescontoIncondicionado() != null ? request.getDescontoIncondicionado() : BigDecimal.ZERO;
        BigDecimal baseCalculo = request.getValorServico().subtract(valorDeducoes).subtract(descontoInc);
        BigDecimal valorIss = baseCalculo.multiply(request.getAliquotaIss()).divide(BigDecimal.valueOf(100), 2, BigDecimal.ROUND_HALF_UP);
        BigDecimal valorIssRetido = request.isIssRetido() ? valorIss : BigDecimal.ZERO;

        BigDecimal totalRetencoes = sum(request.getValorPis(), request.getValorCofins(), request.getValorInss(),
                request.getValorIr(), request.getValorCsll(), request.getOutrasRetencoes(), valorIssRetido);
        BigDecimal valorLiquido = request.getValorServico().subtract(totalRetencoes).subtract(descontoInc);

        DadosTomador tomador = DadosTomador.builder()
                .cpfCnpj(request.getTomador().getCpfCnpj())
                .inscricaoMunicipal(request.getTomador().getInscricaoMunicipal())
                .razaoSocial(request.getTomador().getRazaoSocial())
                .endereco(request.getTomador().getEndereco())
                .numero(request.getTomador().getNumero())
                .complemento(request.getTomador().getComplemento())
                .bairro(request.getTomador().getBairro())
                .cidade(request.getTomador().getCidade())
                .uf(request.getTomador().getUf())
                .cep(request.getTomador().getCep())
                .telefone(request.getTomador().getTelefone())
                .email(request.getTomador().getEmail())
                .build();

        NotaFiscalServico nfse = NotaFiscalServico.builder()
                .numero(numero)
                .tomador(tomador)
                .codigoServico(request.getCodigoServico())
                .descricaoServico(request.getDescricaoServico())
                .codigoCnae(request.getCodigoCnae())
                .codigoTributacaoMunicipio(request.getCodigoTributacaoMunicipio())
                .valorServico(request.getValorServico())
                .valorDeducoes(valorDeducoes)
                .baseCalculo(baseCalculo)
                .aliquotaIss(request.getAliquotaIss())
                .valorIss(valorIss)
                .valorIssRetido(valorIssRetido)
                .issRetido(request.isIssRetido())
                .valorPis(request.getValorPis())
                .valorCofins(request.getValorCofins())
                .valorInss(request.getValorInss())
                .valorIr(request.getValorIr())
                .valorCsll(request.getValorCsll())
                .outrasRetencoes(request.getOutrasRetencoes())
                .valorLiquidoNfse(valorLiquido)
                .descontoIncondicionado(descontoInc)
                .descontoCondicionado(request.getDescontoCondicionado())
                .dataEmissao(LocalDateTime.now())
                .competencia(request.getCompetencia())
                .codigoMunicipioIncidencia(request.getCodigoMunicipioIncidencia())
                .status(StatusNfse.RASCUNHO)
                .numeroRps(request.getNumeroRps())
                .serieRps(request.getSerieRps())
                .observacao(request.getObservacao())
                .build();
        nfse.setTenantId(tenantId);
        nfse.setEmpresaId(empresaId);

        nfse = nfseRepository.save(nfse);
        log.info("NFS-e #{} criada - valor: {} (tenant: {})", numero, request.getValorServico(), tenantId);
        return toResponse(nfse);
    }

    public NfseResponse autorizarNfse(String id) {
        String tenantId = TenantContext.getTenantId();
        NotaFiscalServico nfse = findByIdAndTenant(id, tenantId);
        if (nfse.getStatus() != StatusNfse.RASCUNHO) {
            throw new BusinessException("NFSE_NAO_RASCUNHO", "NFS-e não está em rascunho");
        }
        // Simulação de envio à prefeitura
        nfse.setStatus(StatusNfse.AUTORIZADA);
        nfse.setProtocoloAutorizacao("PROT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        nfse.setDataAutorizacao(Instant.now());
        nfse.setCodigoVerificacao(UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        nfse = nfseRepository.save(nfse);
        log.info("NFS-e #{} autorizada - protocolo: {} (tenant: {})", nfse.getNumero(), nfse.getProtocoloAutorizacao(), tenantId);
        return toResponse(nfse);
    }

    public NfseResponse cancelarNfse(String id, String motivo) {
        String tenantId = TenantContext.getTenantId();
        NotaFiscalServico nfse = findByIdAndTenant(id, tenantId);
        if (nfse.getStatus() == StatusNfse.CANCELADA) {
            throw new BusinessException("NFSE_JA_CANCELADA", "NFS-e já está cancelada");
        }
        nfse.setStatus(StatusNfse.CANCELADA);
        nfse.setMotivoCancelamento(motivo);
        nfse.setDataCancelamento(Instant.now());
        nfse = nfseRepository.save(nfse);
        log.info("NFS-e #{} cancelada (tenant: {})", nfse.getNumero(), tenantId);
        return toResponse(nfse);
    }

    public Page<NfseResponse> listarNfses(Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return nfseRepository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable).map(this::toResponse);
    }

    public NfseResponse getById(String id) {
        return toResponse(findByIdAndTenant(id, TenantContext.getTenantId()));
    }

    public List<NfseResponse> listarPorCompetencia(LocalDate inicio, LocalDate fim) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return nfseRepository.findByTenantIdAndEmpresaIdAndCompetenciaBetween(tenantId, empresaId, inicio, fim)
                .stream().map(this::toResponse).toList();
    }

    public List<NfseResponse> listarPorTomador(String cpfCnpj) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return nfseRepository.findByTenantIdAndEmpresaIdAndTomadorCpfCnpj(tenantId, empresaId, cpfCnpj)
                .stream().map(this::toResponse).toList();
    }

    private NotaFiscalServico findByIdAndTenant(String id, String tenantId) {
        NotaFiscalServico nfse = nfseRepository.findById(id)
                .orElseThrow(() -> new BusinessException("NFSE_NAO_ENCONTRADA", "NFS-e não encontrada"));
        if (!nfse.getTenantId().equals(tenantId)) throw new BusinessException("ACESSO_NEGADO", "Acesso negado");
        return nfse;
    }

    private BigDecimal sum(BigDecimal... values) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal v : values) if (v != null) total = total.add(v);
        return total;
    }

    private NfseResponse toResponse(NotaFiscalServico n) {
        return NfseResponse.builder()
                .id(n.getId()).numero(n.getNumero()).codigoVerificacao(n.getCodigoVerificacao())
                .prestadorCnpj(n.getPrestador() != null ? n.getPrestador().getCnpj() : null)
                .prestadorRazaoSocial(n.getPrestador() != null ? n.getPrestador().getRazaoSocial() : null)
                .tomadorCpfCnpj(n.getTomador() != null ? n.getTomador().getCpfCnpj() : null)
                .tomadorRazaoSocial(n.getTomador() != null ? n.getTomador().getRazaoSocial() : null)
                .codigoServico(n.getCodigoServico()).descricaoServico(n.getDescricaoServico())
                .valorServico(n.getValorServico()).baseCalculo(n.getBaseCalculo())
                .aliquotaIss(n.getAliquotaIss()).valorIss(n.getValorIss())
                .valorIssRetido(n.getValorIssRetido()).issRetido(n.isIssRetido())
                .valorLiquidoNfse(n.getValorLiquidoNfse())
                .valorPis(n.getValorPis()).valorCofins(n.getValorCofins())
                .valorInss(n.getValorInss()).valorIr(n.getValorIr()).valorCsll(n.getValorCsll())
                .dataEmissao(n.getDataEmissao()).competencia(n.getCompetencia())
                .municipio(n.getMunicipio()).uf(n.getUf())
                .status(n.getStatus().name()).protocoloAutorizacao(n.getProtocoloAutorizacao())
                .dataAutorizacao(n.getDataAutorizacao()).numeroRps(n.getNumeroRps())
                .observacao(n.getObservacao())
                .build();
    }
}
