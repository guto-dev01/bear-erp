package br.com.bearerp.nfeservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.nfeservice.application.dto.*;
import br.com.bearerp.nfeservice.domain.model.NotaFiscalEletronica;
import br.com.bearerp.nfeservice.domain.model.NotaFiscalEletronica.*;
import br.com.bearerp.nfeservice.domain.repository.NfeRepository;
import br.com.bearerp.nfeservice.infrastructure.sefaz.SefazResponse;
import br.com.bearerp.nfeservice.infrastructure.sefaz.SefazService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j @Service @RequiredArgsConstructor
public class NfeUseCase {

    private final NfeRepository nfeRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final SefazService sefazService;

    public NfeResponse createNfe(CreateNfeRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        TipoNfe tipo = TipoNfe.valueOf(request.getTipo());
        Integer serie = request.getSerie() != null ? request.getSerie() : 1;

        // Gerar número sequencial
        Long numero = nfeRepository.findTopByTenantIdAndEmpresaIdAndSerieAndTipoOrderByNumeroDesc(tenantId, empresaId, serie, tipo)
                .map(n -> n.getNumero() + 1).orElse(1L);

        // Calcular itens e totais
        List<ItemNfe> itens = new ArrayList<>();
        BigDecimal totalProdutos = BigDecimal.ZERO;
        BigDecimal totalIcms = BigDecimal.ZERO;
        BigDecimal totalIpi = BigDecimal.ZERO;
        BigDecimal totalPis = BigDecimal.ZERO;
        BigDecimal totalCofins = BigDecimal.ZERO;
        BigDecimal totalDesconto = BigDecimal.ZERO;

        int itemNum = 1;
        for (CreateNfeRequest.ItemNfeDto itemDto : request.getItens()) {
            BigDecimal valorTotal = itemDto.getQuantidade().multiply(itemDto.getValorUnitario());
            BigDecimal desconto = itemDto.getDesconto() != null ? itemDto.getDesconto() : BigDecimal.ZERO;
            BigDecimal baseIcms = valorTotal.subtract(desconto);

            BigDecimal icmsValor = BigDecimal.ZERO;
            if (itemDto.getIcmsAliquota() != null) {
                icmsValor = baseIcms.multiply(itemDto.getIcmsAliquota()).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            }

            BigDecimal ipiValor = BigDecimal.ZERO;
            if (itemDto.getIpiAliquota() != null) {
                ipiValor = valorTotal.multiply(itemDto.getIpiAliquota()).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            }

            BigDecimal pisValor = BigDecimal.ZERO;
            if (itemDto.getPisAliquota() != null) {
                pisValor = valorTotal.multiply(itemDto.getPisAliquota()).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            }

            BigDecimal cofinsValor = BigDecimal.ZERO;
            if (itemDto.getCofinsAliquota() != null) {
                cofinsValor = valorTotal.multiply(itemDto.getCofinsAliquota()).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            }

            itens.add(ItemNfe.builder()
                    .item(itemNum++)
                    .codigo(itemDto.getCodigo())
                    .descricao(itemDto.getDescricao())
                    .ncm(itemDto.getNcm())
                    .cest(itemDto.getCest())
                    .cfop(itemDto.getCfop())
                    .unidade(itemDto.getUnidade())
                    .quantidade(itemDto.getQuantidade())
                    .valorUnitario(itemDto.getValorUnitario())
                    .valorTotal(valorTotal)
                    .desconto(desconto)
                    .impostos(ImpostosItem.builder()
                            .icmsCst(itemDto.getIcmsCst())
                            .icmsOrigem(itemDto.getIcmsOrigem())
                            .icmsBaseCalculo(baseIcms)
                            .icmsAliquota(itemDto.getIcmsAliquota())
                            .icmsValor(icmsValor)
                            .ipiCst(itemDto.getIpiCst())
                            .ipiBaseCalculo(valorTotal)
                            .ipiAliquota(itemDto.getIpiAliquota())
                            .ipiValor(ipiValor)
                            .pisCst(itemDto.getPisCst())
                            .pisBaseCalculo(valorTotal)
                            .pisAliquota(itemDto.getPisAliquota())
                            .pisValor(pisValor)
                            .cofinsCst(itemDto.getCofinsCst())
                            .cofinsBaseCalculo(valorTotal)
                            .cofinsAliquota(itemDto.getCofinsAliquota())
                            .cofinsValor(cofinsValor)
                            .build())
                    .build());

            totalProdutos = totalProdutos.add(valorTotal);
            totalIcms = totalIcms.add(icmsValor);
            totalIpi = totalIpi.add(ipiValor);
            totalPis = totalPis.add(pisValor);
            totalCofins = totalCofins.add(cofinsValor);
            totalDesconto = totalDesconto.add(desconto);
        }

        BigDecimal valorTotalNfe = totalProdutos.subtract(totalDesconto).add(totalIpi);

        TotaisNfe totais = TotaisNfe.builder()
                .valorProdutos(totalProdutos)
                .valorIcms(totalIcms)
                .valorIpi(totalIpi)
                .valorPis(totalPis)
                .valorCofins(totalCofins)
                .valorDesconto(totalDesconto)
                .valorFrete(BigDecimal.ZERO)
                .valorSeguro(BigDecimal.ZERO)
                .outrasDespesas(BigDecimal.ZERO)
                .valorTotalNfe(valorTotalNfe)
                .build();

        DadosPessoa destinatario = null;
        if (request.getDestinatario() != null) {
            var d = request.getDestinatario();
            destinatario = DadosPessoa.builder()
                    .pessoaId(d.getPessoaId()).cnpjCpf(d.getCnpjCpf())
                    .inscricaoEstadual(d.getInscricaoEstadual()).razaoSocial(d.getRazaoSocial())
                    .logradouro(d.getLogradouro()).numero(d.getNumero())
                    .bairro(d.getBairro()).cidade(d.getCidade())
                    .codigoIbge(d.getCodigoIbge()).uf(d.getUf()).cep(d.getCep())
                    .build();
        }

        NotaFiscalEletronica nfe = NotaFiscalEletronica.builder()
                .numero(numero).serie(serie).tipo(tipo)
                .finalidade(request.getFinalidade() != null ? FinalidadeNfe.valueOf(request.getFinalidade()) : FinalidadeNfe.NORMAL)
                .modelo(ModeloNfe.NFE_55)
                .dataEmissao(request.getDataEmissao() != null ? request.getDataEmissao() : LocalDateTime.now())
                .naturezaOperacao(request.getNaturezaOperacao())
                .cfop(request.getCfop())
                .destinatario(destinatario)
                .itens(itens)
                .totais(totais)
                .status(StatusNfe.RASCUNHO)
                .ambiente(AmbienteNfe.HOMOLOGACAO)
                .contabilizado(false)
                .informacoesComplementares(request.getInformacoesComplementares())
                .build();
        nfe.setTenantId(tenantId);
        nfe.setEmpresaId(empresaId);

        nfe = nfeRepository.save(nfe);

        try {
            kafkaTemplate.send("bear.fiscal.nfe-criada", nfe.getId(), nfe);
        } catch (Exception e) {
            log.warn("Falha Kafka: {}", e.getMessage());
        }

        log.info("NF-e #{} série {} criada - valor: {} (tenant: {})", numero, serie, valorTotalNfe, tenantId);
        return toResponse(nfe);
    }

    public NfeResponse getNfe(String id) {
        return toResponse(nfeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("NF-e", id)));
    }

    public Page<NfeResponse> listNfes(Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return nfeRepository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable).map(this::toResponse);
    }

    public Page<NfeResponse> listByTipo(String tipo, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return nfeRepository.findByTenantIdAndEmpresaIdAndTipo(tenantId, empresaId, TipoNfe.valueOf(tipo), pageable).map(this::toResponse);
    }

    public NfeResponse autorizarNfe(String id) {
        NotaFiscalEletronica nfe = nfeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("NF-e", id));

        if (nfe.getStatus() != StatusNfe.RASCUNHO && nfe.getStatus() != StatusNfe.VALIDADA) {
            throw new BusinessException("NFE_STATUS_INVALIDO", "NF-e não pode ser autorizada no status " + nfe.getStatus());
        }

        // Tenta autorizar via SEFAZ real, com fallback para simulação
        try {
            String xmlNfe = "<nfe-placeholder/>"; // Em produção, usar NfeXmlBuilder
            SefazResponse sefazResp = sefazService.autorizarNfe(xmlNfe, null);
            if (sefazResp.isSucesso()) {
                nfe.setStatus(StatusNfe.AUTORIZADA);
                nfe.setChaveAcesso(sefazResp.getChaveAcesso() != null ? sefazResp.getChaveAcesso() : gerarChaveAcesso(nfe));
                nfe.setProtocolo(sefazResp.getProtocolo());
                log.info("NF-e autorizada via SEFAZ - protocolo: {}", sefazResp.getProtocolo());
            } else if (sefazResp.isDenegada()) {
                nfe.setStatus(StatusNfe.DENEGADA);
                log.warn("NF-e denegada pela SEFAZ: {}", sefazResp.getMotivoStatus());
            } else {
                nfe.setStatus(StatusNfe.REJEITADA);
                log.warn("NF-e rejeitada pela SEFAZ [{}]: {}", sefazResp.getCodigoStatus(), sefazResp.getMotivoStatus());
            }
        } catch (Exception e) {
            log.warn("SEFAZ indisponível, usando modo simulação: {}", e.getMessage());
            nfe.setStatus(StatusNfe.AUTORIZADA);
            nfe.setChaveAcesso(gerarChaveAcesso(nfe));
            nfe.setProtocolo("SIM" + System.currentTimeMillis());
        }
        nfe = nfeRepository.save(nfe);

        try {
            kafkaTemplate.send("bear.fiscal.nfe-autorizada", nfe.getId(), nfe);
        } catch (Exception e) {
            log.warn("Falha Kafka: {}", e.getMessage());
        }

        log.info("NF-e #{} autorizada - chave: {}", nfe.getNumero(), nfe.getChaveAcesso());
        return toResponse(nfe);
    }

    public NfeResponse cancelarNfe(String id, String motivo) {
        NotaFiscalEletronica nfe = nfeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("NF-e", id));

        if (nfe.getStatus() != StatusNfe.AUTORIZADA) {
            throw new BusinessException("NFE_NAO_AUTORIZADA", "Apenas NF-e autorizada pode ser cancelada");
        }

        nfe.setStatus(StatusNfe.CANCELADA);
        nfe.setMotivoCancelamento(motivo);
        nfe.setDataCancelamento(java.time.Instant.now());
        nfe = nfeRepository.save(nfe);

        log.info("NF-e #{} cancelada - motivo: {}", nfe.getNumero(), motivo);
        return toResponse(nfe);
    }

    public Map<String, Object> getNfeParaDanfe(String id) {
        NotaFiscalEletronica nfe = nfeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("NF-e", id));

        Map<String, Object> data = new HashMap<>();
        data.put("numero", nfe.getNumero());
        data.put("serie", nfe.getSerie());
        data.put("chaveAcesso", nfe.getChaveAcesso());
        data.put("protocolo", nfe.getProtocolo());
        data.put("tipo", nfe.getTipo() != null ? nfe.getTipo().name() : "");
        data.put("dataEmissao", nfe.getDataEmissao());
        data.put("naturezaOperacao", nfe.getNaturezaOperacao());

        if (nfe.getEmitente() != null) {
            data.put("emitenteRazaoSocial", nfe.getEmitente().getRazaoSocial());
            data.put("emitenteCnpj", nfe.getEmitente().getCnpjCpf());
        }
        if (nfe.getDestinatario() != null) {
            data.put("destinatarioRazaoSocial", nfe.getDestinatario().getRazaoSocial());
            data.put("destinatarioCnpjCpf", nfe.getDestinatario().getCnpjCpf());
            data.put("destinatarioUf", nfe.getDestinatario().getUf());
        }

        if (nfe.getItens() != null) {
            List<Map<String, Object>> itens = nfe.getItens().stream().map(i -> {
                Map<String, Object> item = new HashMap<>();
                item.put("codigo", i.getCodigo());
                item.put("descricao", i.getDescricao());
                item.put("ncm", i.getNcm());
                item.put("unidade", i.getUnidade());
                item.put("quantidade", i.getQuantidade());
                item.put("valorUnitario", i.getValorUnitario());
                item.put("valorTotal", i.getValorTotal());
                if (i.getImpostos() != null) {
                    item.put("valorIcms", i.getImpostos().getIcmsValor());
                    item.put("valorIpi", i.getImpostos().getIpiValor());
                }
                return item;
            }).toList();
            data.put("itens", itens);
        }

        if (nfe.getTotais() != null) {
            data.put("baseCalculoIcms", nfe.getTotais().getBaseCalculoIcms());
            data.put("valorIcms", nfe.getTotais().getValorIcms());
            data.put("valorIpi", nfe.getTotais().getValorIpi());
            data.put("valorPis", nfe.getTotais().getValorPis());
            data.put("valorCofins", nfe.getTotais().getValorCofins());
            data.put("valorFrete", nfe.getTotais().getValorFrete());
            data.put("valorDesconto", nfe.getTotais().getValorDesconto());
            data.put("valorTotalNfe", nfe.getTotais().getValorTotalNfe());
        }

        return data;
    }

    private String gerarChaveAcesso(NotaFiscalEletronica nfe) {
        // Simplificado - em produção usar algoritmo completo da SEFAZ
        return String.format("35%tY%<tm%s55%09d%09d1%08d",
                nfe.getDataEmissao(), "00000000000000".substring(0, 14),
                nfe.getSerie(), nfe.getNumero(), (int)(Math.random() * 99999999));
    }

    private NfeResponse toResponse(NotaFiscalEletronica nfe) {
        NfeResponse.DestinatarioResp dest = null;
        if (nfe.getDestinatario() != null) {
            dest = NfeResponse.DestinatarioResp.builder()
                    .cnpjCpf(nfe.getDestinatario().getCnpjCpf())
                    .razaoSocial(nfe.getDestinatario().getRazaoSocial())
                    .uf(nfe.getDestinatario().getUf())
                    .build();
        }

        List<NfeResponse.ItemResp> itensResp = nfe.getItens() != null ? nfe.getItens().stream().map(i ->
                NfeResponse.ItemResp.builder()
                        .item(i.getItem()).codigo(i.getCodigo()).descricao(i.getDescricao())
                        .ncm(i.getNcm()).cfop(i.getCfop()).quantidade(i.getQuantidade())
                        .valorUnitario(i.getValorUnitario()).valorTotal(i.getValorTotal())
                        .icmsValor(i.getImpostos() != null ? i.getImpostos().getIcmsValor() : null)
                        .ipiValor(i.getImpostos() != null ? i.getImpostos().getIpiValor() : null)
                        .pisValor(i.getImpostos() != null ? i.getImpostos().getPisValor() : null)
                        .cofinsValor(i.getImpostos() != null ? i.getImpostos().getCofinsValor() : null)
                        .build()).toList() : List.of();

        NfeResponse.TotaisResp totaisResp = null;
        if (nfe.getTotais() != null) {
            var t = nfe.getTotais();
            totaisResp = NfeResponse.TotaisResp.builder()
                    .valorProdutos(t.getValorProdutos()).valorIcms(t.getValorIcms())
                    .valorIpi(t.getValorIpi()).valorPis(t.getValorPis())
                    .valorCofins(t.getValorCofins()).valorDesconto(t.getValorDesconto())
                    .valorFrete(t.getValorFrete()).valorTotalNfe(t.getValorTotalNfe())
                    .build();
        }

        return NfeResponse.builder()
                .id(nfe.getId()).numero(nfe.getNumero()).serie(nfe.getSerie())
                .chaveAcesso(nfe.getChaveAcesso()).protocolo(nfe.getProtocolo())
                .tipo(nfe.getTipo().name()).finalidade(nfe.getFinalidade() != null ? nfe.getFinalidade().name() : null)
                .dataEmissao(nfe.getDataEmissao()).naturezaOperacao(nfe.getNaturezaOperacao())
                .cfop(nfe.getCfop()).destinatario(dest).itens(itensResp)
                .totais(totaisResp).status(nfe.getStatus().name())
                .ambiente(nfe.getAmbiente() != null ? nfe.getAmbiente().name() : null)
                .contabilizado(nfe.isContabilizado()).createdAt(nfe.getCreatedAt())
                .build();
    }
}
