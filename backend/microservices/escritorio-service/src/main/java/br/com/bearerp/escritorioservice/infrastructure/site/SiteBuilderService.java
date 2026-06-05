package br.com.bearerp.escritorioservice.infrastructure.site;

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
 * Site Builder para Escritórios Contábeis — supera Calima Site:
 * - Templates pré-definidos
 * - Seções: sobre, serviços, equipe, contato, blog, depoimentos
 * - Formulário de contato integrado ao Portal do Cliente
 * - Subdomínio automático: escritorio.bearerp.com.br
 * - SEO básico automático
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SiteBuilderService {

    private final MongoTemplate mongoTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "sites_escritorio")
    public static class SiteEscritorio {
        @Id
        private String id;
        private String tenantId;
        private boolean publicado;
        private String subdominio;           // Ex: "contabilsilva.bearerp.com.br"
        private String dominioCustomizado;   // Ex: "www.contabilsilva.com.br"
        private String templateId;

        // Informações básicas
        private String nomeEscritorio;
        private String slogan;
        private String descricao;
        private String logoUrl;
        private String corPrimaria;
        private String corSecundaria;

        // Contato
        private String telefone;
        private String whatsapp;
        private String email;
        private String endereco;
        private String cidade;
        private String uf;
        private String cep;
        private String googleMapsUrl;

        // Redes sociais
        private String instagram;
        private String facebook;
        private String linkedin;

        // Seções do site
        private SecaoSobre secaoSobre;
        private List<ServicoSite> servicos;
        private List<MembroEquipe> equipe;
        private List<Depoimento> depoimentos;
        private SecaoBlog secaoBlog;

        // SEO
        private String metaTitle;
        private String metaDescription;
        private String metaKeywords;
        private String googleAnalyticsId;

        // Controle
        private Instant criadoEm;
        private Instant atualizadoEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SecaoSobre {
        private String titulo;
        private String texto;
        private String missao;
        private String visao;
        private String valores;
        private int anosExperiencia;
        private int clientesAtendidos;
        private String imagemUrl;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ServicoSite {
        private String titulo;
        private String descricao;
        private String icone;                // Material Icon name
        private boolean destaque;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MembroEquipe {
        private String nome;
        private String cargo;
        private String descricao;
        private String fotoUrl;
        private String crc;                  // Registro no CRC
        private String linkedin;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Depoimento {
        private String clienteNome;
        private String empresa;
        private String texto;
        private int estrelas;                // 1-5
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SecaoBlog {
        private boolean habilitado;
        private List<PostBlog> posts;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PostBlog {
        private String titulo;
        private String resumo;
        private String conteudo;
        private String autor;
        private String dataPublicacao;
        private String categoria;            // FISCAL, CONTABIL, TRABALHISTA, EMPRESARIAL
        private List<String> tags;
    }

    // === CRUD ===

    public SiteEscritorio criar(SiteEscritorio site) {
        site.setTenantId(TenantContext.getTenantId());
        site.setCriadoEm(Instant.now());
        site.setPublicado(false);

        // Gerar subdomínio
        if (site.getSubdominio() == null || site.getSubdominio().isEmpty()) {
            site.setSubdominio(gerarSubdominio(site.getNomeEscritorio()));
        }

        // SEO automático
        if (site.getMetaTitle() == null) {
            site.setMetaTitle(site.getNomeEscritorio() + " - Escritório de Contabilidade");
        }
        if (site.getMetaDescription() == null) {
            site.setMetaDescription("Escritório de contabilidade " + site.getNomeEscritorio() +
                    " em " + (site.getCidade() != null ? site.getCidade() : "") +
                    ". Serviços contábeis, fiscais e trabalhistas.");
        }

        return mongoTemplate.save(site);
    }

    public SiteEscritorio atualizar(String id, SiteEscritorio site) {
        SiteEscritorio existente = mongoTemplate.findById(id, SiteEscritorio.class);
        if (existente == null) throw new RuntimeException("Site não encontrado");

        site.setId(id);
        site.setTenantId(existente.getTenantId());
        site.setCriadoEm(existente.getCriadoEm());
        site.setAtualizadoEm(Instant.now());

        return mongoTemplate.save(site);
    }

    public SiteEscritorio publicar(String id) {
        SiteEscritorio site = mongoTemplate.findById(id, SiteEscritorio.class);
        if (site == null) throw new RuntimeException("Site não encontrado");
        site.setPublicado(true);
        site.setAtualizadoEm(Instant.now());
        return mongoTemplate.save(site);
    }

    public SiteEscritorio despublicar(String id) {
        SiteEscritorio site = mongoTemplate.findById(id, SiteEscritorio.class);
        if (site == null) throw new RuntimeException("Site não encontrado");
        site.setPublicado(false);
        return mongoTemplate.save(site);
    }

    public SiteEscritorio buscar() {
        return mongoTemplate.findOne(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())),
                SiteEscritorio.class);
    }

    // === TEMPLATES ===

    public List<Map<String, Object>> listarTemplates() {
        List<Map<String, Object>> templates = new ArrayList<>();

        templates.add(Map.of(
                "id", "moderno",
                "nome", "Moderno",
                "descricao", "Design clean e moderno com animações suaves",
                "corPrimaria", "#1a237e",
                "corSecundaria", "#ff6f00",
                "preview", "/templates/moderno-preview.png"
        ));

        templates.add(Map.of(
                "id", "classico",
                "nome", "Clássico",
                "descricao", "Visual tradicional e profissional",
                "corPrimaria", "#0d47a1",
                "corSecundaria", "#2e7d32",
                "preview", "/templates/classico-preview.png"
        ));

        templates.add(Map.of(
                "id", "minimalista",
                "nome", "Minimalista",
                "descricao", "Visual limpo e objetivo",
                "corPrimaria", "#212121",
                "corSecundaria", "#f57c00",
                "preview", "/templates/minimalista-preview.png"
        ));

        templates.add(Map.of(
                "id", "corporativo",
                "nome", "Corporativo",
                "descricao", "Para escritórios de grande porte",
                "corPrimaria", "#1b5e20",
                "corSecundaria", "#01579b",
                "preview", "/templates/corporativo-preview.png"
        ));

        return templates;
    }

    /**
     * Criar site a partir de template com dados pré-preenchidos
     */
    public SiteEscritorio criarDeTemplate(String templateId, String nomeEscritorio) {
        List<ServicoSite> servicosPadrao = List.of(
                ServicoSite.builder().titulo("Contabilidade").descricao("Escrituração contábil, balanços, balancetes e demonstrações financeiras").icone("calculate").destaque(true).build(),
                ServicoSite.builder().titulo("Fiscal e Tributário").descricao("Apuração de impostos, SPED, declarações acessórias e planejamento tributário").icone("receipt_long").destaque(true).build(),
                ServicoSite.builder().titulo("Departamento Pessoal").descricao("Folha de pagamento, admissão, demissão, férias e eSocial").icone("people").destaque(true).build(),
                ServicoSite.builder().titulo("Abertura de Empresas").descricao("Constituição, alteração e baixa de empresas em todos os regimes").icone("business").destaque(false).build(),
                ServicoSite.builder().titulo("Consultoria").descricao("Assessoria contábil e fiscal personalizada para seu negócio").icone("support_agent").destaque(false).build(),
                ServicoSite.builder().titulo("Imposto de Renda").descricao("Declaração de IR pessoa física e jurídica").icone("description").destaque(false).build()
        );

        SiteEscritorio site = SiteEscritorio.builder()
                .nomeEscritorio(nomeEscritorio)
                .templateId(templateId)
                .slogan("Seu parceiro em contabilidade")
                .servicos(new ArrayList<>(servicosPadrao))
                .equipe(new ArrayList<>())
                .depoimentos(new ArrayList<>())
                .secaoSobre(SecaoSobre.builder()
                        .titulo("Sobre Nós")
                        .texto("Somos um escritório de contabilidade comprometido com a excelência.")
                        .build())
                .secaoBlog(SecaoBlog.builder().habilitado(false).posts(new ArrayList<>()).build())
                .build();

        return criar(site);
    }

    private String gerarSubdominio(String nome) {
        if (nome == null) return "escritorio-" + UUID.randomUUID().toString().substring(0, 8);
        return nome.toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}
