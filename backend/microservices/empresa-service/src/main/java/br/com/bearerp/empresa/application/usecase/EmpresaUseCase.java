package br.com.bearerp.empresa.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.common.util.CpfCnpjValidator;
import br.com.bearerp.empresa.application.dto.CreateEmpresaRequest;
import br.com.bearerp.empresa.application.dto.EmpresaResponse;
import br.com.bearerp.empresa.domain.event.EmpresaCreatedEvent;
import br.com.bearerp.empresa.domain.model.Empresa;
import br.com.bearerp.empresa.domain.model.Endereco;
import br.com.bearerp.empresa.domain.repository.EmpresaRepository;
import br.com.bearerp.security.crypto.AesEncryptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmpresaUseCase {

    private final EmpresaRepository empresaRepository;
    private final AesEncryptor aesEncryptor;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public EmpresaResponse createEmpresa(CreateEmpresaRequest request) {
        String tenantId = TenantContext.getTenantId();

        if (!CpfCnpjValidator.isValidCnpj(request.getCnpj())) {
            throw new BusinessException("INVALID_CNPJ", "CNPJ inválido");
        }

        String encryptedCnpj = aesEncryptor.encrypt(request.getCnpj().replaceAll("[^0-9]", ""));

        if (empresaRepository.existsByCnpjAndTenantId(encryptedCnpj, tenantId)) {
            throw new BusinessException("EMPRESA_EXISTS", "Já existe uma empresa com este CNPJ neste tenant");
        }

        Empresa empresa = Empresa.builder()
                .razaoSocial(request.getRazaoSocial())
                .nomeFantasia(request.getNomeFantasia())
                .cnpj(encryptedCnpj)
                .inscricaoEstadual(request.getInscricaoEstadual())
                .inscricaoMunicipal(request.getInscricaoMunicipal())
                .cnae(request.getCnae())
                .cnaesSecundarios(request.getCnaesSecundarios() != null ? request.getCnaesSecundarios() : List.of())
                .regimeTributario(Empresa.RegimeTributario.valueOf(request.getRegimeTributario()))
                .porte(request.getPorte() != null ? Empresa.Porte.valueOf(request.getPorte()) : Empresa.Porte.ME)
                .telefone(request.getTelefone())
                .email(request.getEmail())
                .responsavelContabil(request.getResponsavelContabil())
                .dataAbertura(request.getDataAbertura())
                .status(Empresa.Status.ATIVA)
                .build();

        empresa.setTenantId(tenantId);

        if (request.getEndereco() != null) {
            empresa.setEndereco(Endereco.builder()
                    .logradouro(request.getEndereco().getLogradouro())
                    .numero(request.getEndereco().getNumero())
                    .complemento(request.getEndereco().getComplemento())
                    .bairro(request.getEndereco().getBairro())
                    .cidade(request.getEndereco().getCidade())
                    .estado(request.getEndereco().getEstado())
                    .cep(request.getEndereco().getCep())
                    .codigoIbge(request.getEndereco().getCodigoIbge())
                    .build());
        }

        empresa = empresaRepository.save(empresa);

        var event = new EmpresaCreatedEvent(tenantId, empresa.getId(), null,
                empresa.getRazaoSocial(), empresa.getRegimeTributario().name());
        kafkaTemplate.send("bear.empresa.created", empresa.getId(), event);

        log.info("Empresa criada: {} no tenant: {}", empresa.getRazaoSocial(), tenantId);
        return toResponse(empresa);
    }

    public EmpresaResponse getEmpresa(String id) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", id));
        return toResponse(empresa);
    }

    public Page<EmpresaResponse> listEmpresas(Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        return empresaRepository.findByTenantId(tenantId, pageable).map(this::toResponse);
    }

    public Page<EmpresaResponse> listByRegime(String regime, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        return empresaRepository.findByTenantIdAndRegimeTributario(
                tenantId, Empresa.RegimeTributario.valueOf(regime), pageable).map(this::toResponse);
    }

    private EmpresaResponse toResponse(Empresa empresa) {
        return EmpresaResponse.builder()
                .id(empresa.getId())
                .tenantId(empresa.getTenantId())
                .razaoSocial(empresa.getRazaoSocial())
                .nomeFantasia(empresa.getNomeFantasia())
                .cnae(empresa.getCnae())
                .cnaesSecundarios(empresa.getCnaesSecundarios())
                .regimeTributario(empresa.getRegimeTributario().name())
                .porte(empresa.getPorte().name())
                .status(empresa.getStatus().name())
                .telefone(empresa.getTelefone())
                .email(empresa.getEmail())
                .responsavelContabil(empresa.getResponsavelContabil())
                .dataAbertura(empresa.getDataAbertura())
                .createdAt(empresa.getCreatedAt())
                .build();
    }
}
