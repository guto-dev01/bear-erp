package br.com.bearerp.fornecedores.application.usecase;

import br.com.bearerp.fornecedores.application.dto.*;
import br.com.bearerp.fornecedores.domain.model.Fornecedor;
import br.com.bearerp.fornecedores.domain.model.Fornecedor.*;
import br.com.bearerp.fornecedores.domain.repository.FornecedorRepository;
import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.common.util.CpfCnpjValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FornecedorUseCase {

    private final FornecedorRepository fornecedorRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public FornecedorResponse create(CreateFornecedorRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        String doc = request.getCnpjCpf().replaceAll("[^0-9]", "");
        if ("JURIDICA".equals(request.getTipoPessoa())) {
            if (!CpfCnpjValidator.isValidCnpj(doc)) {
                throw new BusinessException("CNPJ_INVALIDO", "CNPJ inválido: " + request.getCnpjCpf());
            }
        } else {
            if (!CpfCnpjValidator.isValidCpf(doc)) {
                throw new BusinessException("CPF_INVALIDO", "CPF inválido: " + request.getCnpjCpf());
            }
        }

        if (fornecedorRepository.existsByTenantIdAndEmpresaIdAndCnpjCpf(tenantId, empresaId, request.getCnpjCpf())) {
            throw new BusinessException("FORNECEDOR_EXISTS", "Já existe um fornecedor com o CPF/CNPJ " + request.getCnpjCpf());
        }

        Fornecedor fornecedor = Fornecedor.builder()
                .razaoSocial(request.getRazaoSocial())
                .nomeFantasia(request.getNomeFantasia())
                .tipoPessoa(TipoPessoa.valueOf(request.getTipoPessoa()))
                .cnpjCpf(request.getCnpjCpf())
                .inscricaoEstadual(request.getInscricaoEstadual())
                .inscricaoMunicipal(request.getInscricaoMunicipal())
                .email(request.getEmail())
                .telefone(request.getTelefone())
                .celular(request.getCelular())
                .website(request.getWebsite())
                .observacoes(request.getObservacoes())
                .categorias(request.getCategorias())
                .prazoEntrega(request.getPrazoEntrega())
                .condicaoPagamento(request.getCondicaoPagamento())
                .avaliacaoMedia(BigDecimal.ZERO)
                .endereco(Endereco.builder()
                        .logradouro(request.getLogradouro()).numero(request.getNumero())
                        .complemento(request.getComplemento()).bairro(request.getBairro())
                        .cidade(request.getCidade()).uf(request.getUf())
                        .cep(request.getCep()).codigoIbge(request.getCodigoIbge())
                        .build())
                .contatoPrincipal(ContatoPrincipal.builder()
                        .nome(request.getContatoNome()).email(request.getContatoEmail())
                        .telefone(request.getContatoTelefone()).cargo(request.getContatoCargo())
                        .build())
                .dadosBancarios(DadosBancarios.builder()
                        .banco(request.getBanco()).agencia(request.getAgencia())
                        .conta(request.getConta()).tipoConta(request.getTipoConta())
                        .pix(request.getPix())
                        .build())
                .status(StatusFornecedor.ATIVO)
                .build();
        fornecedor.setTenantId(tenantId);
        fornecedor.setEmpresaId(empresaId);

        fornecedor = fornecedorRepository.save(fornecedor);
        log.info("Fornecedor criado: {} - {} (tenant: {})", fornecedor.getCnpjCpf(), fornecedor.getRazaoSocial(), tenantId);

        try { kafkaTemplate.send("fornecedor-events", fornecedor.getId(), fornecedor); } catch (Exception e) { log.warn("Kafka indisponível: {}", e.getMessage()); }

        return toResponse(fornecedor);
    }

    public FornecedorResponse update(String id, CreateFornecedorRequest request) {
        Fornecedor f = fornecedorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", id));

        if (request.getRazaoSocial() != null) f.setRazaoSocial(request.getRazaoSocial());
        if (request.getNomeFantasia() != null) f.setNomeFantasia(request.getNomeFantasia());
        if (request.getEmail() != null) f.setEmail(request.getEmail());
        if (request.getTelefone() != null) f.setTelefone(request.getTelefone());
        if (request.getCelular() != null) f.setCelular(request.getCelular());
        if (request.getWebsite() != null) f.setWebsite(request.getWebsite());
        if (request.getObservacoes() != null) f.setObservacoes(request.getObservacoes());
        if (request.getCategorias() != null) f.setCategorias(request.getCategorias());
        if (request.getCondicaoPagamento() != null) f.setCondicaoPagamento(request.getCondicaoPagamento());

        f = fornecedorRepository.save(f);
        return toResponse(f);
    }

    public FornecedorResponse getById(String id) {
        return toResponse(fornecedorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", id)));
    }

    public List<FornecedorResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return fornecedorRepository.findByTenantIdAndEmpresaId(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public List<FornecedorResponse> search(String query) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return fornecedorRepository.search(tenantId, empresaId, query)
                .stream().map(this::toResponse).toList();
    }

    public void delete(String id) {
        Fornecedor f = fornecedorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", id));
        f.setStatus(StatusFornecedor.INATIVO);
        fornecedorRepository.save(f);
        log.info("Fornecedor desativado: {}", id);
    }

    private FornecedorResponse toResponse(Fornecedor f) {
        FornecedorResponse.FornecedorResponseBuilder b = FornecedorResponse.builder()
                .id(f.getId()).razaoSocial(f.getRazaoSocial()).nomeFantasia(f.getNomeFantasia())
                .tipoPessoa(f.getTipoPessoa() != null ? f.getTipoPessoa().name() : null)
                .cnpjCpf(f.getCnpjCpf()).inscricaoEstadual(f.getInscricaoEstadual())
                .email(f.getEmail()).telefone(f.getTelefone()).celular(f.getCelular())
                .website(f.getWebsite()).observacoes(f.getObservacoes())
                .status(f.getStatus() != null ? f.getStatus().name() : null)
                .categorias(f.getCategorias()).prazoEntrega(f.getPrazoEntrega())
                .condicaoPagamento(f.getCondicaoPagamento()).avaliacaoMedia(f.getAvaliacaoMedia())
                .createdAt(f.getCreatedAt());

        if (f.getEndereco() != null) {
            b.logradouro(f.getEndereco().getLogradouro()).numero(f.getEndereco().getNumero())
             .complemento(f.getEndereco().getComplemento()).bairro(f.getEndereco().getBairro())
             .cidade(f.getEndereco().getCidade()).uf(f.getEndereco().getUf()).cep(f.getEndereco().getCep());
        }
        if (f.getContatoPrincipal() != null) {
            b.contatoNome(f.getContatoPrincipal().getNome()).contatoEmail(f.getContatoPrincipal().getEmail())
             .contatoTelefone(f.getContatoPrincipal().getTelefone()).contatoCargo(f.getContatoPrincipal().getCargo());
        }
        if (f.getDadosBancarios() != null) {
            b.banco(f.getDadosBancarios().getBanco()).agencia(f.getDadosBancarios().getAgencia())
             .conta(f.getDadosBancarios().getConta()).tipoConta(f.getDadosBancarios().getTipoConta())
             .pix(f.getDadosBancarios().getPix());
        }
        return b.build();
    }
}
