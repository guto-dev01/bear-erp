package br.com.bearerp.tenant.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "planos_assinatura")
public class PlanoAssinatura extends BaseDocument {

    private TipoPlano plano;
    private String tenantId;
    private StatusAssinatura status;

    // Limites do plano
    private int limiteEmpresas;
    private int limiteUsuarios;
    private int limiteFuncionarios;       // Total de funcionários na folha
    private long limiteArmazenamentoMb;

    // Módulos habilitados
    private boolean moduloContabil;
    private boolean moduloFiscal;
    private boolean moduloFolha;
    private boolean moduloPatrimonio;
    private boolean moduloFinanceiro;
    private boolean moduloHonorarios;
    private boolean moduloPortalCliente;
    private boolean moduloIA;
    private boolean moduloOCR;
    private boolean moduloEcac;
    private boolean moduloNfeRobo;
    private boolean moduloRelatoriosCustom;
    private boolean moduloSiteBuilder;
    private boolean moduloApiAberta;

    // Valores
    private BigDecimal valorMensal;
    private BigDecimal valorAnual;
    private String formaPagamento;
    private LocalDate dataInicio;
    private LocalDate dataRenovacao;
    private LocalDate dataExpiracao;

    // Uso atual
    private int empresasAtivas;
    private int usuariosAtivos;
    private long armazenamentoUsadoMb;

    // Trial
    private boolean emTrial;
    private LocalDate fimTrial;
    private int diasRestantesTrial;

    public enum TipoPlano {
        FREE,        // Grátis: 5 empresas, contábil+fiscal básico
        STARTER,     // R$99/mês: 30 empresas, +folha+patrimônio
        PRO,         // R$199/mês: ilimitado, +IA+OCR+e-CAC+financeiro
        ENTERPRISE   // Personalizado: multi-escritório+API+SLA
    }

    public enum StatusAssinatura {
        ATIVA, TRIAL, SUSPENSA, CANCELADA, EXPIRADA
    }

    // Factory methods para cada plano
    public static PlanoAssinatura criarFree(String tenantId) {
        return PlanoAssinatura.builder()
                .tenantId(tenantId)
                .plano(TipoPlano.FREE)
                .status(StatusAssinatura.ATIVA)
                .limiteEmpresas(5)
                .limiteUsuarios(2)
                .limiteFuncionarios(50)
                .limiteArmazenamentoMb(500)
                .moduloContabil(true)
                .moduloFiscal(true)
                .moduloFolha(false)
                .moduloPatrimonio(false)
                .moduloFinanceiro(false)
                .moduloHonorarios(false)
                .moduloPortalCliente(false)
                .moduloIA(false)
                .moduloOCR(false)
                .moduloEcac(false)
                .moduloNfeRobo(false)
                .moduloRelatoriosCustom(false)
                .moduloSiteBuilder(false)
                .moduloApiAberta(false)
                .valorMensal(BigDecimal.ZERO)
                .valorAnual(BigDecimal.ZERO)
                .dataInicio(LocalDate.now())
                .build();
    }

    public static PlanoAssinatura criarStarter(String tenantId) {
        return PlanoAssinatura.builder()
                .tenantId(tenantId)
                .plano(TipoPlano.STARTER)
                .status(StatusAssinatura.TRIAL)
                .emTrial(true)
                .fimTrial(LocalDate.now().plusDays(14))
                .diasRestantesTrial(14)
                .limiteEmpresas(30)
                .limiteUsuarios(5)
                .limiteFuncionarios(300)
                .limiteArmazenamentoMb(5000)
                .moduloContabil(true)
                .moduloFiscal(true)
                .moduloFolha(true)
                .moduloPatrimonio(true)
                .moduloFinanceiro(true)
                .moduloHonorarios(true)
                .moduloPortalCliente(true)
                .moduloIA(false)
                .moduloOCR(false)
                .moduloEcac(false)
                .moduloNfeRobo(false)
                .moduloRelatoriosCustom(true)
                .moduloSiteBuilder(false)
                .moduloApiAberta(false)
                .valorMensal(new BigDecimal("99.90"))
                .valorAnual(new BigDecimal("999.00"))
                .dataInicio(LocalDate.now())
                .dataRenovacao(LocalDate.now().plusMonths(1))
                .build();
    }

    public static PlanoAssinatura criarPro(String tenantId) {
        return PlanoAssinatura.builder()
                .tenantId(tenantId)
                .plano(TipoPlano.PRO)
                .status(StatusAssinatura.TRIAL)
                .emTrial(true)
                .fimTrial(LocalDate.now().plusDays(14))
                .diasRestantesTrial(14)
                .limiteEmpresas(Integer.MAX_VALUE)
                .limiteUsuarios(20)
                .limiteFuncionarios(Integer.MAX_VALUE)
                .limiteArmazenamentoMb(50000)
                .moduloContabil(true)
                .moduloFiscal(true)
                .moduloFolha(true)
                .moduloPatrimonio(true)
                .moduloFinanceiro(true)
                .moduloHonorarios(true)
                .moduloPortalCliente(true)
                .moduloIA(true)
                .moduloOCR(true)
                .moduloEcac(true)
                .moduloNfeRobo(true)
                .moduloRelatoriosCustom(true)
                .moduloSiteBuilder(true)
                .moduloApiAberta(false)
                .valorMensal(new BigDecimal("199.90"))
                .valorAnual(new BigDecimal("1999.00"))
                .dataInicio(LocalDate.now())
                .dataRenovacao(LocalDate.now().plusMonths(1))
                .build();
    }

    public static PlanoAssinatura criarEnterprise(String tenantId) {
        return PlanoAssinatura.builder()
                .tenantId(tenantId)
                .plano(TipoPlano.ENTERPRISE)
                .status(StatusAssinatura.TRIAL)
                .emTrial(true)
                .fimTrial(LocalDate.now().plusDays(30))
                .diasRestantesTrial(30)
                .limiteEmpresas(Integer.MAX_VALUE)
                .limiteUsuarios(Integer.MAX_VALUE)
                .limiteFuncionarios(Integer.MAX_VALUE)
                .limiteArmazenamentoMb(500000)
                .moduloContabil(true)
                .moduloFiscal(true)
                .moduloFolha(true)
                .moduloPatrimonio(true)
                .moduloFinanceiro(true)
                .moduloHonorarios(true)
                .moduloPortalCliente(true)
                .moduloIA(true)
                .moduloOCR(true)
                .moduloEcac(true)
                .moduloNfeRobo(true)
                .moduloRelatoriosCustom(true)
                .moduloSiteBuilder(true)
                .moduloApiAberta(true)
                .valorMensal(new BigDecimal("499.90"))
                .valorAnual(new BigDecimal("4999.00"))
                .dataInicio(LocalDate.now())
                .dataRenovacao(LocalDate.now().plusMonths(1))
                .build();
    }

    public boolean isModuloPermitido(String modulo) {
        return switch (modulo) {
            case "contabil" -> moduloContabil;
            case "fiscal" -> moduloFiscal;
            case "folha" -> moduloFolha;
            case "patrimonio" -> moduloPatrimonio;
            case "financeiro" -> moduloFinanceiro;
            case "honorarios" -> moduloHonorarios;
            case "portal" -> moduloPortalCliente;
            case "ia" -> moduloIA;
            case "ocr" -> moduloOCR;
            case "ecac" -> moduloEcac;
            case "nfe-robo" -> moduloNfeRobo;
            case "relatorios-custom" -> moduloRelatoriosCustom;
            case "site-builder" -> moduloSiteBuilder;
            case "api" -> moduloApiAberta;
            default -> false;
        };
    }
}
