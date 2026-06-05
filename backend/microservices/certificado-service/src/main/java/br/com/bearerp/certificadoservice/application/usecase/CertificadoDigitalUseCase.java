package br.com.bearerp.certificadoservice.application.usecase;

import br.com.bearerp.certificadoservice.domain.model.CertificadoDigital;
import br.com.bearerp.certificadoservice.domain.model.CertificadoDigital.StatusCertificado;
import br.com.bearerp.certificadoservice.domain.model.CertificadoDigital.TipoCertificado;
import br.com.bearerp.certificadoservice.domain.model.OperacaoCertificado;
import br.com.bearerp.certificadoservice.domain.repository.CertificadoDigitalRepository;
import br.com.bearerp.certificadoservice.domain.repository.OperacaoCertificadoRepository;
import br.com.bearerp.common.domain.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor
public class CertificadoDigitalUseCase {
    private final CertificadoDigitalRepository certificadoRepository;
    private final OperacaoCertificadoRepository operacaoRepository;

    public CertificadoDigital cadastrar(String nome, TipoCertificado tipo, String cnpjCpf, String razaoSocial,
                                         String serialNumber, String emissor, LocalDate dataEmissao, LocalDate dataValidade,
                                         byte[] arquivoPfx, String senhaCriptografada, String observacao) {
        StatusCertificado status = calcularStatus(dataValidade);

        CertificadoDigital cert = CertificadoDigital.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .nome(nome).tipo(tipo).cnpjCpf(cnpjCpf).razaoSocial(razaoSocial)
                .serialNumber(serialNumber).emissor(emissor)
                .dataEmissao(dataEmissao).dataValidade(dataValidade).status(status)
                .arquivoPfx(arquivoPfx).senhaCriptografada(senhaCriptografada)
                .totalUsos(0).observacao(observacao)
                .build();
        return certificadoRepository.save(cert);
    }

    public List<CertificadoDigital> listar() {
        List<CertificadoDigital> certs = certificadoRepository.findByTenantIdAndEmpresaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId());
        certs.forEach(this::atualizarStatusSeNecessario);
        return certs;
    }

    public List<CertificadoDigital> listarAtivos() {
        return certificadoRepository.findByTenantIdAndEmpresaIdAndStatus(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), StatusCertificado.ATIVO);
    }

    public List<CertificadoDigital> listarProximosVencimento() {
        LocalDate hoje = LocalDate.now();
        LocalDate limite = hoje.plusDays(30);
        return certificadoRepository.findByDataValidadeBetween(hoje, limite);
    }

    public CertificadoDigital revogar(String id) {
        CertificadoDigital cert = certificadoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificado não encontrado"));
        cert.setStatus(StatusCertificado.REVOGADO);
        return certificadoRepository.save(cert);
    }

    public OperacaoCertificado registrarOperacao(String certificadoId, OperacaoCertificado.TipoOperacao tipoOperacao,
                                                  OperacaoCertificado.StatusOperacao statusOperacao,
                                                  String descricao, String documentoReferencia, String erroMensagem) {
        CertificadoDigital cert = certificadoRepository.findById(certificadoId)
                .orElseThrow(() -> new RuntimeException("Certificado não encontrado"));

        cert.setUltimoUso(Instant.now());
        cert.setUltimoUsoOperacao(tipoOperacao.name());
        cert.setTotalUsos(cert.getTotalUsos() + 1);
        certificadoRepository.save(cert);

        OperacaoCertificado op = OperacaoCertificado.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .certificadoId(certificadoId).tipoOperacao(tipoOperacao).statusOperacao(statusOperacao)
                .dataOperacao(Instant.now()).descricao(descricao)
                .documentoReferencia(documentoReferencia).erroMensagem(erroMensagem)
                .build();
        return operacaoRepository.save(op);
    }

    public Page<OperacaoCertificado> listarOperacoes(String certificadoId, Pageable pageable) {
        return operacaoRepository.findByCertificadoId(certificadoId, pageable);
    }

    public CertificadoDigital buscarPorId(String id) {
        CertificadoDigital cert = certificadoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificado não encontrado"));
        atualizarStatusSeNecessario(cert);
        return cert;
    }

    private void atualizarStatusSeNecessario(CertificadoDigital cert) {
        StatusCertificado novoStatus = calcularStatus(cert.getDataValidade());
        if (cert.getStatus() != StatusCertificado.REVOGADO && cert.getStatus() != novoStatus) {
            cert.setStatus(novoStatus);
            certificadoRepository.save(cert);
        }
    }

    private StatusCertificado calcularStatus(LocalDate dataValidade) {
        LocalDate hoje = LocalDate.now();
        if (dataValidade.isBefore(hoje)) return StatusCertificado.EXPIRADO;
        if (dataValidade.isBefore(hoje.plusDays(30))) return StatusCertificado.PROXIMO_VENCIMENTO;
        return StatusCertificado.ATIVO;
    }
}
