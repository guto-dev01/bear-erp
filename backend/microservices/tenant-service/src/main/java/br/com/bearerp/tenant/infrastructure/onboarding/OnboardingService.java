package br.com.bearerp.tenant.infrastructure.onboarding;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Onboarding + Help Center — supera concorrentes:
 * - Wizard de configuração inicial (passo a passo)
 * - Tours guiados por módulo
 * - Base de conhecimento com busca
 * - Vídeos tutoriais categorizados
 * - Checklist de primeiro uso
 * - Central de ajuda in-app
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final MongoTemplate mongoTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "onboarding_progresso")
    public static class OnboardingProgresso {
        @Id
        private String id;
        private String tenantId;
        private String usuarioId;
        private boolean wizardCompleto;
        private int etapaAtual;
        private int totalEtapas;
        private double progresso;
        private List<EtapaOnboarding> etapas;
        private Map<String, Boolean> toursVisualizados;
        private Instant iniciadoEm;
        private Instant completoEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class EtapaOnboarding {
        private int ordem;
        private String titulo;
        private String descricao;
        private String icone;
        private String rota;                 // Rota no frontend
        private boolean obrigatoria;
        private boolean completa;
        private Instant completaEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ArtigoAjuda {
        private String id;
        private String categoria;
        private String titulo;
        private String resumo;
        private String conteudo;
        private String videoUrl;
        private List<String> tags;
        private int visualizacoes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TourGuiado {
        private String id;
        private String modulo;
        private String titulo;
        private List<PassoTour> passos;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PassoTour {
        private int ordem;
        private String elementoAlvo;         // CSS selector
        private String titulo;
        private String descricao;
        private String posicao;              // TOP, BOTTOM, LEFT, RIGHT
    }

    // === WIZARD DE CONFIGURAÇÃO ===

    public OnboardingProgresso iniciarOnboarding(String usuarioId) {
        List<EtapaOnboarding> etapas = List.of(
                EtapaOnboarding.builder().ordem(1).titulo("Dados do Escritório")
                        .descricao("Configure o nome, CNPJ e endereço do seu escritório contábil")
                        .icone("business").rota("/configuracoes/escritorio").obrigatoria(true).build(),
                EtapaOnboarding.builder().ordem(2).titulo("Certificado Digital")
                        .descricao("Cadastre o certificado digital A1 ou A3 do escritório")
                        .icone("verified_user").rota("/certificados").obrigatoria(true).build(),
                EtapaOnboarding.builder().ordem(3).titulo("Primeira Empresa")
                        .descricao("Cadastre a primeira empresa cliente do seu escritório")
                        .icone("domain_add").rota("/empresas/nova").obrigatoria(true).build(),
                EtapaOnboarding.builder().ordem(4).titulo("Plano de Contas")
                        .descricao("Importe ou crie o plano de contas contábil")
                        .icone("account_tree").rota("/contabilidade/plano-contas").obrigatoria(true).build(),
                EtapaOnboarding.builder().ordem(5).titulo("Configurar Impostos")
                        .descricao("Configure o regime tributário e alíquotas da empresa")
                        .icone("calculate").rota("/fiscal/configuracoes").obrigatoria(true).build(),
                EtapaOnboarding.builder().ordem(6).titulo("Equipe")
                        .descricao("Convide os colaboradores do escritório")
                        .icone("group_add").rota("/configuracoes/usuarios").obrigatoria(false).build(),
                EtapaOnboarding.builder().ordem(7).titulo("Portal do Cliente")
                        .descricao("Configure o portal de acesso dos seus clientes")
                        .icone("public").rota("/portal-cliente/configurar").obrigatoria(false).build(),
                EtapaOnboarding.builder().ordem(8).titulo("Honorários")
                        .descricao("Configure os contratos de honorários")
                        .icone("payments").rota("/honorarios/contratos").obrigatoria(false).build()
        );

        OnboardingProgresso progresso = OnboardingProgresso.builder()
                .tenantId(TenantContext.getTenantId())
                .usuarioId(usuarioId)
                .wizardCompleto(false)
                .etapaAtual(1)
                .totalEtapas(etapas.size())
                .progresso(0)
                .etapas(new ArrayList<>(etapas))
                .toursVisualizados(new HashMap<>())
                .iniciadoEm(Instant.now())
                .build();

        return mongoTemplate.save(progresso);
    }

    public OnboardingProgresso completarEtapa(String usuarioId, int etapa) {
        OnboardingProgresso progresso = mongoTemplate.findOne(
                Query.query(Criteria.where("usuarioId").is(usuarioId)),
                OnboardingProgresso.class);
        if (progresso == null) progresso = iniciarOnboarding(usuarioId);

        for (EtapaOnboarding e : progresso.getEtapas()) {
            if (e.getOrdem() == etapa) {
                e.setCompleta(true);
                e.setCompletaEm(Instant.now());
                break;
            }
        }

        long completas = progresso.getEtapas().stream().filter(EtapaOnboarding::isCompleta).count();
        progresso.setProgresso((double) completas / progresso.getTotalEtapas());
        progresso.setEtapaAtual(Math.min(etapa + 1, progresso.getTotalEtapas()));

        boolean todasObrigatoriasCompletas = progresso.getEtapas().stream()
                .filter(EtapaOnboarding::isObrigatoria)
                .allMatch(EtapaOnboarding::isCompleta);

        if (todasObrigatoriasCompletas) {
            progresso.setWizardCompleto(true);
            progresso.setCompletoEm(Instant.now());
        }

        return mongoTemplate.save(progresso);
    }

    public OnboardingProgresso buscarProgresso(String usuarioId) {
        OnboardingProgresso progresso = mongoTemplate.findOne(
                Query.query(Criteria.where("usuarioId").is(usuarioId)),
                OnboardingProgresso.class);
        if (progresso == null) return iniciarOnboarding(usuarioId);
        return progresso;
    }

    // === TOURS GUIADOS ===

    public List<TourGuiado> listarTours() {
        return List.of(
                TourGuiado.builder().id("dashboard").modulo("Dashboard").titulo("Conhecendo o Dashboard")
                        .passos(List.of(
                                PassoTour.builder().ordem(1).elementoAlvo("#widget-empresas").titulo("Suas Empresas")
                                        .descricao("Aqui você vê o resumo de todas as empresas do escritório").posicao("BOTTOM").build(),
                                PassoTour.builder().ordem(2).elementoAlvo("#widget-obrigacoes").titulo("Obrigações")
                                        .descricao("Calendário de obrigações acessórias com prazo e status").posicao("BOTTOM").build(),
                                PassoTour.builder().ordem(3).elementoAlvo("#widget-alertas").titulo("Alertas")
                                        .descricao("Notificações importantes: certificados vencendo, guias em atraso").posicao("LEFT").build()
                        )).build(),
                TourGuiado.builder().id("contabilidade").modulo("Contabilidade").titulo("Módulo Contábil")
                        .passos(List.of(
                                PassoTour.builder().ordem(1).elementoAlvo("#menu-lancamentos").titulo("Lançamentos")
                                        .descricao("Crie lançamentos contábeis manuais ou automáticos via importação").posicao("RIGHT").build(),
                                PassoTour.builder().ordem(2).elementoAlvo("#menu-plano-contas").titulo("Plano de Contas")
                                        .descricao("Gerencie o plano de contas referencial e de cada empresa").posicao("RIGHT").build(),
                                PassoTour.builder().ordem(3).elementoAlvo("#menu-relatorios").titulo("Relatórios")
                                        .descricao("Balanço, DRE, Balancete, Razão e mais relatórios contábeis").posicao("RIGHT").build()
                        )).build(),
                TourGuiado.builder().id("fiscal").modulo("Fiscal").titulo("Módulo Fiscal")
                        .passos(List.of(
                                PassoTour.builder().ordem(1).elementoAlvo("#menu-nfe").titulo("Notas Fiscais")
                                        .descricao("Emissão, importação e consulta de NF-e, NFS-e e CT-e").posicao("RIGHT").build(),
                                PassoTour.builder().ordem(2).elementoAlvo("#menu-apuracao").titulo("Apuração")
                                        .descricao("Apuração automática de ICMS, PIS, COFINS, ISS").posicao("RIGHT").build(),
                                PassoTour.builder().ordem(3).elementoAlvo("#menu-sped").titulo("SPED")
                                        .descricao("Geração e validação de EFD ICMS/IPI, EFD Contribuições, ECD, ECF").posicao("RIGHT").build()
                        )).build(),
                TourGuiado.builder().id("pessoal").modulo("Pessoal").titulo("Departamento Pessoal")
                        .passos(List.of(
                                PassoTour.builder().ordem(1).elementoAlvo("#menu-folha").titulo("Folha de Pagamento")
                                        .descricao("Cálculo de folha com INSS, IRRF, FGTS e provisões automáticas").posicao("RIGHT").build(),
                                PassoTour.builder().ordem(2).elementoAlvo("#menu-esocial").titulo("eSocial")
                                        .descricao("Envio de eventos com semáforo e timeline por funcionário").posicao("RIGHT").build()
                        )).build()
        );
    }

    public void registrarTourVisualizado(String usuarioId, String tourId) {
        OnboardingProgresso progresso = buscarProgresso(usuarioId);
        progresso.getToursVisualizados().put(tourId, true);
        mongoTemplate.save(progresso);
    }

    // === BASE DE CONHECIMENTO ===

    public List<ArtigoAjuda> buscarArtigos(String busca) {
        List<ArtigoAjuda> todos = listarArtigos();
        if (busca == null || busca.isBlank()) return todos;

        String buscaLower = busca.toLowerCase();
        return todos.stream()
                .filter(a -> a.getTitulo().toLowerCase().contains(buscaLower)
                        || a.getResumo().toLowerCase().contains(buscaLower)
                        || a.getTags().stream().anyMatch(t -> t.toLowerCase().contains(buscaLower)))
                .toList();
    }

    public List<ArtigoAjuda> listarArtigos() {
        return List.of(
                ArtigoAjuda.builder().id("1").categoria("Primeiros Passos")
                        .titulo("Como cadastrar minha primeira empresa")
                        .resumo("Passo a passo para cadastrar uma empresa cliente no Bear ERP")
                        .tags(List.of("empresa", "cadastro", "início")).build(),
                ArtigoAjuda.builder().id("2").categoria("Primeiros Passos")
                        .titulo("Importando plano de contas")
                        .resumo("Como importar o plano de contas de outro sistema ou usar o referencial")
                        .tags(List.of("plano de contas", "importação", "contabilidade")).build(),
                ArtigoAjuda.builder().id("3").categoria("Contabilidade")
                        .titulo("Lançamentos contábeis automáticos")
                        .resumo("Configure lançamentos recorrentes e importação de extratos")
                        .tags(List.of("lançamento", "automático", "recorrente")).build(),
                ArtigoAjuda.builder().id("4").categoria("Fiscal")
                        .titulo("Configurando o Robô de NF-e")
                        .resumo("Automatize a captura de notas fiscais de todas as empresas")
                        .tags(List.of("nfe", "robô", "automação", "SEFAZ")).build(),
                ArtigoAjuda.builder().id("5").categoria("Fiscal")
                        .titulo("Gerando SPED Fiscal e Contribuições")
                        .resumo("Como gerar e validar arquivos SPED sem precisar do PVA")
                        .tags(List.of("sped", "fiscal", "validação", "EFD")).build(),
                ArtigoAjuda.builder().id("6").categoria("Pessoal")
                        .titulo("Folha de pagamento: simulação e cálculo")
                        .resumo("Simule a folha antes de efetivar e gere provisões automáticas")
                        .tags(List.of("folha", "simulação", "provisão", "INSS", "IRRF")).build(),
                ArtigoAjuda.builder().id("7").categoria("Pessoal")
                        .titulo("eSocial: semáforo e reprocessamento")
                        .resumo("Acompanhe o status de envio de eventos e reprocesse rejeitados")
                        .tags(List.of("esocial", "semáforo", "reprocessamento")).build(),
                ArtigoAjuda.builder().id("8").categoria("Integrações")
                        .titulo("Consulta automática ao e-CAC")
                        .resumo("Configure a consulta diária de situação fiscal e pendências")
                        .tags(List.of("ecac", "receita federal", "certidão", "pendência")).build(),
                ArtigoAjuda.builder().id("9").categoria("Escritório")
                        .titulo("Portal do Cliente: chat e checklist")
                        .resumo("Comunique-se com clientes e gerencie documentos pelo portal")
                        .tags(List.of("portal", "cliente", "chat", "checklist")).build(),
                ArtigoAjuda.builder().id("10").categoria("Escritório")
                        .titulo("Honorários com NFS-e automática")
                        .resumo("Configure contratos e emita NFS-e automaticamente ao faturar")
                        .tags(List.of("honorário", "nfse", "faturamento", "contrato")).build(),
                ArtigoAjuda.builder().id("11").categoria("Tributário")
                        .titulo("Simulador de regime tributário")
                        .resumo("Compare Simples Nacional, Lucro Presumido e Lucro Real")
                        .tags(List.of("simples", "presumido", "real", "simulação", "regime")).build(),
                ArtigoAjuda.builder().id("12").categoria("Patrimônio")
                        .titulo("Depreciação: métodos e impairment")
                        .resumo("Calcule depreciação por diferentes métodos e teste de impairment CPC 01")
                        .tags(List.of("depreciação", "patrimônio", "impairment", "CPC")).build()
        );
    }
}
