package br.com.bearerp.fornecedores.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "fornecedores")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_cnpjcpf", def = "{'tenantId': 1, 'empresaId': 1, 'cnpjCpf': 1}", unique = true)
})
public class Fornecedor extends BaseDocument {

    private String razaoSocial;
    private String nomeFantasia;
    private TipoPessoa tipoPessoa;
    private String cnpjCpf;
    private String inscricaoEstadual;
    private String inscricaoMunicipal;

    private String email;
    private String telefone;
    private String celular;
    private String website;

    private Endereco endereco;
    private ContatoPrincipal contatoPrincipal;
    private DadosBancarios dadosBancarios;

    private List<String> categorias;
    private int prazoEntrega;
    private String condicaoPagamento;
    private BigDecimal avaliacaoMedia;
    private String observacoes;
    private StatusFornecedor status;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Endereco {
        private String logradouro;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String uf;
        private String cep;
        private String codigoIbge;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ContatoPrincipal {
        private String nome;
        private String email;
        private String telefone;
        private String cargo;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DadosBancarios {
        private String banco;
        private String agencia;
        private String conta;
        private String tipoConta;
        private String pix;
    }

    public enum TipoPessoa { FISICA, JURIDICA }
    public enum StatusFornecedor { ATIVO, INATIVO, BLOQUEADO }
}
