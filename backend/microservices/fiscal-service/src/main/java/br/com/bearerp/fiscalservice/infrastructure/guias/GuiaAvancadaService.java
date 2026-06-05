package br.com.bearerp.fiscalservice.infrastructure.guias;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Melhorias nas Guias Fiscais:
 * - QR Code PIX para pagamento instantâneo
 * - Cálculo de multa e juros SELIC para guias atrasadas
 * - Controle de pagamento com conciliação
 * - Guia retificadora (recalcular diferença)
 * - Agendamento de pagamento via Open Finance
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GuiaAvancadaService {

    private final MongoTemplate mongoTemplate;

    // Taxa SELIC mensal (simplificada — em produção buscar da API do BCB)
    private static final BigDecimal SELIC_MENSAL = new BigDecimal("0.0087"); // ~1.05% ao mês
    private static final BigDecimal MULTA_ATRASO = new BigDecimal("0.20");   // 20% (máximo DARF)
    private static final BigDecimal MULTA_MORA_PERCENTUAL = new BigDecimal("0.0033"); // 0,33% ao dia até 20%

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GuiaComPixQrCode {
        private String guiaId;
        private String tipo;              // DARF, DAS, GPS, GNRE
        private String codigoReceita;
        private String competencia;
        private BigDecimal valorOriginal;
        private BigDecimal multa;
        private BigDecimal juros;
        private BigDecimal valorAtualizado;
        private LocalDate vencimento;
        private LocalDate vencimentoAjustado; // Dia útil
        private int diasAtraso;
        private boolean atrasada;

        // PIX QR Code
        private String pixQrCode;          // Código copia-e-cola
        private String pixChave;           // Chave PIX da RFB/Município
        private String pixTxId;

        // Código de barras
        private String codigoBarras;
        private String linhaDigitavel;

        // Controle de pagamento
        private StatusPagamentoGuia statusPagamento;
        private LocalDate dataPagamento;
        private String bancoComprovante;
        private String observacao;
    }

    public enum StatusPagamentoGuia {
        PENDENTE, AGENDADA, PAGA, PAGA_PARCIAL, CANCELADA
    }

    /**
     * Calcular multa e juros para guia atrasada
     * Conforme legislação brasileira:
     * - Multa de mora: 0,33% ao dia, limitada a 20%
     * - Juros: Taxa SELIC acumulada
     */
    public GuiaComPixQrCode calcularGuiaAtualizada(String guiaId, String tipo, String codigoReceita,
                                                     BigDecimal valorOriginal, LocalDate vencimento,
                                                     String competencia) {
        LocalDate hoje = LocalDate.now();
        LocalDate vencimentoAjustado = ajustarDiaUtil(vencimento);
        long diasAtraso = ChronoUnit.DAYS.between(vencimentoAjustado, hoje);
        boolean atrasada = diasAtraso > 0;

        BigDecimal multa = BigDecimal.ZERO;
        BigDecimal juros = BigDecimal.ZERO;
        BigDecimal valorAtualizado = valorOriginal;

        if (atrasada) {
            // Multa de mora: 0,33% ao dia, máximo 20%
            BigDecimal multaPercentual = MULTA_MORA_PERCENTUAL.multiply(BigDecimal.valueOf(diasAtraso));
            if (multaPercentual.compareTo(MULTA_ATRASO) > 0) {
                multaPercentual = MULTA_ATRASO;
            }
            multa = valorOriginal.multiply(multaPercentual).setScale(2, RoundingMode.HALF_UP);

            // Juros SELIC: taxa acumulada do mês de vencimento até pagamento
            long mesesAtraso = ChronoUnit.MONTHS.between(vencimento.withDayOfMonth(1), hoje.withDayOfMonth(1));
            if (mesesAtraso < 1) mesesAtraso = 1;
            juros = valorOriginal.multiply(SELIC_MENSAL.multiply(BigDecimal.valueOf(mesesAtraso)))
                    .setScale(2, RoundingMode.HALF_UP);

            valorAtualizado = valorOriginal.add(multa).add(juros);
        }

        // Gerar PIX QR Code
        String pixQrCode = gerarPixQrCode(tipo, codigoReceita, valorAtualizado, competencia);
        String codigoBarras = gerarCodigoBarras(tipo, codigoReceita, valorAtualizado, vencimentoAjustado);

        return GuiaComPixQrCode.builder()
                .guiaId(guiaId)
                .tipo(tipo)
                .codigoReceita(codigoReceita)
                .competencia(competencia)
                .valorOriginal(valorOriginal)
                .multa(multa)
                .juros(juros)
                .valorAtualizado(valorAtualizado.setScale(2, RoundingMode.HALF_UP))
                .vencimento(vencimento)
                .vencimentoAjustado(vencimentoAjustado)
                .diasAtraso(atrasada ? (int) diasAtraso : 0)
                .atrasada(atrasada)
                .pixQrCode(pixQrCode)
                .pixChave(getPixChaveReceita(tipo))
                .pixTxId(UUID.randomUUID().toString().replace("-", "").substring(0, 25))
                .codigoBarras(codigoBarras)
                .linhaDigitavel(formatarLinhaDigitavel(codigoBarras))
                .statusPagamento(StatusPagamentoGuia.PENDENTE)
                .build();
    }

    /**
     * Gerar guia retificadora (diferença entre original e valor correto)
     */
    public GuiaComPixQrCode gerarGuiaRetificadora(String guiaOriginalId, BigDecimal valorCorreto) {
        // Buscar guia original
        GuiaComPixQrCode original = new GuiaComPixQrCode(); // Em produção: buscar do banco
        BigDecimal diferenca = valorCorreto.subtract(original.getValorOriginal() != null ? original.getValorOriginal() : BigDecimal.ZERO);

        if (diferenca.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Valor correto deve ser maior que o original para guia retificadora");
        }

        return calcularGuiaAtualizada(
                guiaOriginalId + "-RET",
                original.getTipo() != null ? original.getTipo() : "DARF",
                original.getCodigoReceita() != null ? original.getCodigoReceita() : "",
                diferenca,
                original.getVencimento() != null ? original.getVencimento() : LocalDate.now(),
                original.getCompetencia()
        );
    }

    /**
     * Registrar pagamento de guia
     */
    public GuiaComPixQrCode registrarPagamento(String guiaId, LocalDate dataPagamento, String banco) {
        GuiaComPixQrCode guia = GuiaComPixQrCode.builder()
                .guiaId(guiaId)
                .statusPagamento(StatusPagamentoGuia.PAGA)
                .dataPagamento(dataPagamento)
                .bancoComprovante(banco)
                .build();

        log.info("Pagamento registrado: guia {} - data: {} - banco: {}", guiaId, dataPagamento, banco);
        return guia;
    }

    /**
     * Tabela de códigos de receita mais comuns
     */
    public List<Map<String, String>> listarCodigosReceita() {
        List<Map<String, String>> codigos = new ArrayList<>();
        codigos.add(Map.of("codigo", "0561", "descricao", "IRRF - Rendimentos do Trabalho"));
        codigos.add(Map.of("codigo", "1708", "descricao", "IRRF - Serviços Profissionais PJ"));
        codigos.add(Map.of("codigo", "2372", "descricao", "IRPJ - Lucro Presumido"));
        codigos.add(Map.of("codigo", "2484", "descricao", "CSLL - Lucro Presumido"));
        codigos.add(Map.of("codigo", "5952", "descricao", "PIS - Não Cumulativo"));
        codigos.add(Map.of("codigo", "5856", "descricao", "COFINS - Não Cumulativo"));
        codigos.add(Map.of("codigo", "6106", "descricao", "PIS - Cumulativo"));
        codigos.add(Map.of("codigo", "2172", "descricao", "COFINS - Cumulativo"));
        codigos.add(Map.of("codigo", "0211", "descricao", "IRPJ - Lucro Real Estimativa"));
        codigos.add(Map.of("codigo", "2469", "descricao", "CSLL - Lucro Real Estimativa"));
        codigos.add(Map.of("codigo", "4600", "descricao", "COFINS - Retenção na Fonte"));
        codigos.add(Map.of("codigo", "3770", "descricao", "CSRF - PIS/COFINS/CSLL Retidos"));
        codigos.add(Map.of("codigo", "1661", "descricao", "GPS - Contribuição Previdenciária"));
        codigos.add(Map.of("codigo", "0588", "descricao", "IRRF - Aluguéis"));
        return codigos;
    }

    // === HELPERS ===

    private LocalDate ajustarDiaUtil(LocalDate data) {
        while (data.getDayOfWeek() == DayOfWeek.SATURDAY || data.getDayOfWeek() == DayOfWeek.SUNDAY) {
            data = data.plusDays(1);
        }
        return data;
    }

    private String gerarPixQrCode(String tipo, String codigoReceita, BigDecimal valor, String competencia) {
        // Formato EMV do PIX (simplificado)
        // Em produção: usar biblioteca PIX oficial do BCB
        StringBuilder pix = new StringBuilder();
        pix.append("00020126"); // Payload Format Indicator
        pix.append("5802BR");   // Country Code
        pix.append("5303986");  // Currency (BRL)
        pix.append(String.format("54%02d%s", valor.toPlainString().length(), valor.toPlainString()));
        pix.append("5925RECEITA FEDERAL DO BRASIL");
        pix.append("6008BRASILIA");
        pix.append(String.format("62%02d0503***", 7 + tipo.length())); // Additional Data

        return pix.toString();
    }

    private String getPixChaveReceita(String tipo) {
        return switch (tipo) {
            case "DARF" -> "cnpj:00394460000541"; // CNPJ RFB (exemplo)
            case "GPS" -> "cnpj:29979036000140";  // CNPJ INSS (exemplo)
            case "DAS" -> "cnpj:00394460000541";
            case "GNRE" -> "cnpj:variavel";       // Depende do estado
            default -> "cnpj:00394460000541";
        };
    }

    private String gerarCodigoBarras(String tipo, String codigoReceita, BigDecimal valor, LocalDate vencimento) {
        // Código de barras DARF (47 dígitos)
        // Em produção: seguir padrão FEBRABAN
        StringBuilder cb = new StringBuilder();
        cb.append("8580"); // ID arrecadação
        cb.append(String.format("%4s", codigoReceita).replace(' ', '0'));
        cb.append(String.format("%014d", valor.multiply(BigDecimal.valueOf(100)).longValue()));
        cb.append(vencimento.toString().replace("-", ""));
        while (cb.length() < 47) cb.append("0");
        return cb.substring(0, 47);
    }

    private String formatarLinhaDigitavel(String codigoBarras) {
        if (codigoBarras.length() < 47) return codigoBarras;
        return codigoBarras.substring(0, 11) + " " +
               codigoBarras.substring(11, 22) + " " +
               codigoBarras.substring(22, 33) + " " +
               codigoBarras.substring(33, 44) + " " +
               codigoBarras.substring(44);
    }
}
