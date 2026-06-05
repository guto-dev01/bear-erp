package br.com.bearerp.clientes.domain.model;

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
@Document(collection = "clientes")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_cnpjcpf", def = "{'tenantId': 1, 'empresaId': 1, 'cnpjCpf': 1}", unique = true)
})
public class Cliente extends BaseDocument {

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
    private Contato contato;

    private ContribuinteIcms contribuinteIcms;
    private RegimeTributario regimeTributario;

    private String observacoes;
    private StatusCliente status;
    private List<String> tags;
    private BigDecimal limiteCredito;

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
    public static class Contato {
        private String nome;
        private String email;
        private String telefone;
        private String cargo;
    }

    public enum TipoPessoa { FISICA, JURIDICA }
    public enum ContribuinteIcms { CONTRIBUINTE, ISENTO, NAO_CONTRIBUINTE }
    public enum RegimeTributario { SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL, MEI }
    public enum StatusCliente { ATIVO, INATIVO, BLOQUEADO }
}
