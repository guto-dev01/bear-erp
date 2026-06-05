package br.com.bearerp.fiscalservice.infrastructure.dmed;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.fiscalservice.domain.model.Dmed;
import br.com.bearerp.fiscalservice.domain.model.Dmed.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DmedService {

    private final MongoTemplate mongoTemplate;

    public Dmed criarDeclaracao(int anoCalendario) {
        Dmed dmed = Dmed.builder()
                .anoCalendario(anoCalendario)
                .status(StatusDmed.RASCUNHO)
                .beneficiarios(new ArrayList<>())
                .valorTotalDeclarado(BigDecimal.ZERO)
                .totalBeneficiarios(0)
                .tipoDeclarante("SERVICOS_SAUDE")
                .build();
        dmed.setTenantId(TenantContext.getTenantId());
        dmed.setEmpresaId(TenantContext.getEmpresaId());
        return mongoTemplate.save(dmed);
    }

    public Dmed adicionarBeneficiario(String id, BeneficiarioSaude beneficiario) {
        Dmed dmed = buscar(id);
        if (dmed.getBeneficiarios() == null) dmed.setBeneficiarios(new ArrayList<>());

        BigDecimal totalBeneficiario = beneficiario.getPagamentos().stream()
                .map(PagamentoSaude::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        beneficiario.setValorTotal(totalBeneficiario);

        dmed.getBeneficiarios().add(beneficiario);
        recalcularTotais(dmed);
        return mongoTemplate.save(dmed);
    }

    public Dmed validar(String id) {
        Dmed dmed = buscar(id);
        List<String> erros = new ArrayList<>();

        if (dmed.getBeneficiarios() == null || dmed.getBeneficiarios().isEmpty()) {
            erros.add("Nenhum beneficiário informado");
        }
        if (dmed.getCnpjDeclarante() == null || dmed.getCnpjDeclarante().isBlank()) {
            erros.add("CNPJ do declarante não informado");
        }

        if (dmed.getBeneficiarios() != null) {
            for (int i = 0; i < dmed.getBeneficiarios().size(); i++) {
                BeneficiarioSaude b = dmed.getBeneficiarios().get(i);
                if (b.getCpfBeneficiario() == null || b.getCpfBeneficiario().length() != 11) {
                    erros.add("Beneficiário " + (i + 1) + ": CPF inválido");
                }
                if (b.getPagamentos() == null || b.getPagamentos().isEmpty()) {
                    erros.add("Beneficiário " + (i + 1) + ": sem pagamentos");
                }
            }
        }

        if (!erros.isEmpty()) {
            throw new RuntimeException("Erros de validação: " + String.join("; ", erros));
        }

        dmed.setStatus(StatusDmed.VALIDADA);
        return mongoTemplate.save(dmed);
    }

    public String gerarArquivo(String id) {
        Dmed dmed = buscar(id);

        // Layout oficial DMED da RFB
        StringBuilder sb = new StringBuilder();

        // Registro de abertura
        sb.append("DMED|").append(dmed.getAnoCalendario()).append("|")
          .append(dmed.getCnpjDeclarante()).append("|")
          .append(dmed.getRazaoSocialDeclarante()).append("|")
          .append(dmed.getTipoDeclarante()).append("\n");

        // Registros de beneficiários
        if (dmed.getBeneficiarios() != null) {
            for (BeneficiarioSaude ben : dmed.getBeneficiarios()) {
                sb.append("BENEF|").append(ben.getCpfBeneficiario()).append("|")
                  .append(ben.getNomeBeneficiario()).append("|")
                  .append(ben.getValorTotal()).append("\n");

                for (PagamentoSaude pag : ben.getPagamentos()) {
                    sb.append("PGTO|").append(pag.getMes()).append("|")
                      .append(pag.getValor()).append("|")
                      .append(pag.getTipoServico()).append("|")
                      .append(pag.getCpfResponsavelPagamento() != null ? pag.getCpfResponsavelPagamento() : "").append("\n");
                }
            }
        }

        // Registro de encerramento
        sb.append("FIM|").append(dmed.getTotalBeneficiarios()).append("|")
          .append(dmed.getValorTotalDeclarado()).append("\n");

        dmed.setArquivoGerado(sb.toString());
        mongoTemplate.save(dmed);
        return sb.toString();
    }

    public Dmed marcarEntregue(String id, String protocolo, String recibo) {
        Dmed dmed = buscar(id);
        dmed.setStatus(StatusDmed.ENTREGUE);
        dmed.setProtocolo(protocolo);
        dmed.setRecibo(recibo);
        dmed.setDataEntrega(Instant.now());
        return mongoTemplate.save(dmed);
    }

    public Dmed buscar(String id) {
        Dmed dmed = mongoTemplate.findById(id, Dmed.class);
        if (dmed == null) throw new RuntimeException("DMED não encontrada: " + id);
        return dmed;
    }

    public List<Dmed> listar() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("empresaId").is(TenantContext.getEmpresaId())), Dmed.class);
    }

    private void recalcularTotais(Dmed dmed) {
        dmed.setTotalBeneficiarios(dmed.getBeneficiarios().size());
        dmed.setValorTotalDeclarado(dmed.getBeneficiarios().stream()
                .map(BeneficiarioSaude::getValorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }
}
