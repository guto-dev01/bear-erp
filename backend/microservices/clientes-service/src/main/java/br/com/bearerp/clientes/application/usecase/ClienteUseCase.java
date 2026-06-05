package br.com.bearerp.clientes.application.usecase;

import br.com.bearerp.clientes.application.dto.*;
import br.com.bearerp.clientes.domain.model.Cliente;
import br.com.bearerp.clientes.domain.model.Cliente.*;
import br.com.bearerp.clientes.domain.repository.ClienteRepository;
import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.common.util.CpfCnpjValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClienteUseCase {

    private final ClienteRepository clienteRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public ClienteResponse create(CreateClienteRequest request) {
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

        if (clienteRepository.existsByTenantIdAndEmpresaIdAndCnpjCpf(tenantId, empresaId, request.getCnpjCpf())) {
            throw new BusinessException("CLIENTE_EXISTS", "Já existe um cliente com o CPF/CNPJ " + request.getCnpjCpf());
        }

        Cliente cliente = Cliente.builder()
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
                .contribuinteIcms(request.getContribuinteIcms() != null ? ContribuinteIcms.valueOf(request.getContribuinteIcms()) : ContribuinteIcms.NAO_CONTRIBUINTE)
                .regimeTributario(request.getRegimeTributario() != null ? RegimeTributario.valueOf(request.getRegimeTributario()) : null)
                .observacoes(request.getObservacoes())
                .tags(request.getTags())
                .limiteCredito(request.getLimiteCredito())
                .endereco(Endereco.builder()
                        .logradouro(request.getLogradouro())
                        .numero(request.getNumero())
                        .complemento(request.getComplemento())
                        .bairro(request.getBairro())
                        .cidade(request.getCidade())
                        .uf(request.getUf())
                        .cep(request.getCep())
                        .codigoIbge(request.getCodigoIbge())
                        .build())
                .contato(Contato.builder()
                        .nome(request.getContatoNome())
                        .email(request.getContatoEmail())
                        .telefone(request.getContatoTelefone())
                        .cargo(request.getContatoCargo())
                        .build())
                .status(StatusCliente.ATIVO)
                .build();
        cliente.setTenantId(tenantId);
        cliente.setEmpresaId(empresaId);

        cliente = clienteRepository.save(cliente);
        log.info("Cliente criado: {} - {} (tenant: {})", cliente.getCnpjCpf(), cliente.getRazaoSocial(), tenantId);

        try { kafkaTemplate.send("cliente-events", cliente.getId(), cliente); } catch (Exception e) { log.warn("Kafka indisponível: {}", e.getMessage()); }

        return toResponse(cliente);
    }

    public ClienteResponse update(String id, CreateClienteRequest request) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        if (request.getRazaoSocial() != null) cliente.setRazaoSocial(request.getRazaoSocial());
        if (request.getNomeFantasia() != null) cliente.setNomeFantasia(request.getNomeFantasia());
        if (request.getEmail() != null) cliente.setEmail(request.getEmail());
        if (request.getTelefone() != null) cliente.setTelefone(request.getTelefone());
        if (request.getCelular() != null) cliente.setCelular(request.getCelular());
        if (request.getWebsite() != null) cliente.setWebsite(request.getWebsite());
        if (request.getInscricaoEstadual() != null) cliente.setInscricaoEstadual(request.getInscricaoEstadual());
        if (request.getInscricaoMunicipal() != null) cliente.setInscricaoMunicipal(request.getInscricaoMunicipal());
        if (request.getObservacoes() != null) cliente.setObservacoes(request.getObservacoes());
        if (request.getTags() != null) cliente.setTags(request.getTags());
        if (request.getLimiteCredito() != null) cliente.setLimiteCredito(request.getLimiteCredito());
        if (request.getContribuinteIcms() != null) cliente.setContribuinteIcms(ContribuinteIcms.valueOf(request.getContribuinteIcms()));
        if (request.getRegimeTributario() != null) cliente.setRegimeTributario(RegimeTributario.valueOf(request.getRegimeTributario()));

        if (request.getLogradouro() != null) {
            cliente.setEndereco(Endereco.builder()
                    .logradouro(request.getLogradouro()).numero(request.getNumero())
                    .complemento(request.getComplemento()).bairro(request.getBairro())
                    .cidade(request.getCidade()).uf(request.getUf())
                    .cep(request.getCep()).codigoIbge(request.getCodigoIbge())
                    .build());
        }
        if (request.getContatoNome() != null) {
            cliente.setContato(Contato.builder()
                    .nome(request.getContatoNome()).email(request.getContatoEmail())
                    .telefone(request.getContatoTelefone()).cargo(request.getContatoCargo())
                    .build());
        }

        cliente = clienteRepository.save(cliente);
        return toResponse(cliente);
    }

    public ClienteResponse getById(String id) {
        return toResponse(clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id)));
    }

    public List<ClienteResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return clienteRepository.findByTenantIdAndEmpresaId(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public List<ClienteResponse> search(String query) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return clienteRepository.search(tenantId, empresaId, query)
                .stream().map(this::toResponse).toList();
    }

    public void delete(String id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
        cliente.setStatus(StatusCliente.INATIVO);
        clienteRepository.save(cliente);
        log.info("Cliente desativado: {}", id);
    }

    private ClienteResponse toResponse(Cliente c) {
        ClienteResponse.ClienteResponseBuilder b = ClienteResponse.builder()
                .id(c.getId())
                .razaoSocial(c.getRazaoSocial())
                .nomeFantasia(c.getNomeFantasia())
                .tipoPessoa(c.getTipoPessoa() != null ? c.getTipoPessoa().name() : null)
                .cnpjCpf(c.getCnpjCpf())
                .inscricaoEstadual(c.getInscricaoEstadual())
                .inscricaoMunicipal(c.getInscricaoMunicipal())
                .email(c.getEmail())
                .telefone(c.getTelefone())
                .celular(c.getCelular())
                .website(c.getWebsite())
                .contribuinteIcms(c.getContribuinteIcms() != null ? c.getContribuinteIcms().name() : null)
                .regimeTributario(c.getRegimeTributario() != null ? c.getRegimeTributario().name() : null)
                .observacoes(c.getObservacoes())
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .tags(c.getTags())
                .limiteCredito(c.getLimiteCredito())
                .createdAt(c.getCreatedAt());

        if (c.getEndereco() != null) {
            b.logradouro(c.getEndereco().getLogradouro()).numero(c.getEndereco().getNumero())
             .complemento(c.getEndereco().getComplemento()).bairro(c.getEndereco().getBairro())
             .cidade(c.getEndereco().getCidade()).uf(c.getEndereco().getUf())
             .cep(c.getEndereco().getCep());
        }
        if (c.getContato() != null) {
            b.contatoNome(c.getContato().getNome()).contatoEmail(c.getContato().getEmail())
             .contatoTelefone(c.getContato().getTelefone()).contatoCargo(c.getContato().getCargo());
        }
        return b.build();
    }
}
