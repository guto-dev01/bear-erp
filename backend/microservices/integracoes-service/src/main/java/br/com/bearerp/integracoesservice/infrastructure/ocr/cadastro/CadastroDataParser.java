package br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro;

import br.com.bearerp.common.util.CpfCnpjValidator;
import br.com.bearerp.integracoesservice.interfaces.rest.dto.CadastroOcrResponse;
import br.com.bearerp.integracoesservice.interfaces.rest.dto.SocioDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Converte o texto bruto do OCR nos campos estruturados de cadastro, aplicando máscaras,
 * validando CPF/CNPJ, verificando vencimento de CNH e calculando a confiança da extração.
 *
 * <p>As heurísticas são baseadas em rótulos típicos dos documentos brasileiros (RG, CNH,
 * Comprovante de inscrição CNPJ, Contrato Social). OCR é ruidoso por natureza: campos não
 * encontrados ou que falham na validação entram em {@code camposComBaixaConfianca}.</p>
 */
@Slf4j
@Component
public class CadastroDataParser {

    private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final Pattern CPF = Pattern.compile("\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}");
    private static final Pattern CNPJ = Pattern.compile("\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}");
    private static final Pattern CEP = Pattern.compile("\\d{5}-?\\d{3}");
    private static final Pattern DATA = Pattern.compile("\\d{2}/\\d{2}/\\d{4}");
    private static final Pattern CNAE = Pattern.compile("\\d{2}\\.?\\d{2}-?\\d-?\\d{2}");
    private static final Pattern VALOR = Pattern.compile("R\\$\\s*([\\d.]+,\\d{2})");
    private static final Set<String> UFS = new LinkedHashSet<>(Arrays.asList(
            "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
            "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"));

    public CadastroOcrResponse parse(String texto, TipoPessoa tipoPessoa, TipoDocumento tipoDocumento) {
        String[] linhasOriginais = texto.split("\\r?\\n");
        String[] linhasNorm = new String[linhasOriginais.length];
        for (int i = 0; i < linhasOriginais.length; i++) {
            linhasNorm[i] = normalizar(linhasOriginais[i]);
        }

        CadastroOcrResponse r = CadastroOcrResponse.builder().build();
        switch (tipoDocumento) {
            case CNH -> parseCnh(texto, linhasOriginais, linhasNorm, r);
            case RG -> parseRg(texto, linhasOriginais, linhasNorm, r);
            case COMPROVANTE_ENDERECO -> parseEndereco(texto, linhasOriginais, linhasNorm, r);
            case CNPJ -> parseCartaoCnpj(texto, linhasOriginais, linhasNorm, r);
            case CONTRATO_SOCIAL -> parseContratoSocial(texto, linhasOriginais, linhasNorm, r);
        }
        calcularConfianca(r, tipoPessoa, tipoDocumento);
        return r;
    }

    // ───────────────────────── Documentos PF ─────────────────────────

    private void parseCnh(String texto, String[] orig, String[] norm, CadastroOcrResponse r) {
        r.setNomeCompleto(limparNome(valorAposLabel(orig, norm, "NOME", "DOC IDENTIDADE")));
        r.setCpf(extrairCpf(texto, r));
        r.setRg(valorAposLabel(orig, norm, "DOC IDENTIDADE", "ORG EMISSOR"));
        r.setDataNascimento(primeiraDataLabel(orig, norm, "NASCIMENTO", "DATA NASCIMENTO"));

        String[] filiacao = extrairFiliacao(orig, norm);
        r.setNomeMae(filiacao[0]);
        r.setNomePai(filiacao[1]);

        verificarValidadeCnh(orig, norm, r);
    }

    private void parseRg(String texto, String[] orig, String[] norm, CadastroOcrResponse r) {
        r.setNomeCompleto(limparNome(valorAposLabel(orig, norm, "NOME")));
        r.setRg(valorAposLabel(orig, norm, "REGISTRO GERAL", "RG", "REGISTRO"));
        r.setCpf(extrairCpf(texto, r));
        r.setDataNascimento(primeiraDataLabel(orig, norm, "NASCIMENTO", "DATA DE NASCIMENTO"));

        String[] filiacao = extrairFiliacao(orig, norm);
        r.setNomeMae(filiacao[0]);
        r.setNomePai(filiacao[1]);
    }

    private void parseEndereco(String texto, String[] orig, String[] norm, CadastroOcrResponse r) {
        preencherEndereco(texto, orig, norm, r);
    }

    // ───────────────────────── Documentos PJ ─────────────────────────

    private void parseCartaoCnpj(String texto, String[] orig, String[] norm, CadastroOcrResponse r) {
        r.setCnpj(extrairCnpj(texto, r));
        r.setRazaoSocial(limparNome(valorAposLabel(orig, norm, "NOME EMPRESARIAL", "RAZAO SOCIAL")));
        r.setNomeFantasia(limparNome(valorAposLabel(orig, norm, "NOME DE FANTASIA", "TITULO DO ESTABELECIMENTO")));
        r.setDataAbertura(primeiraDataLabel(orig, norm, "DATA DE ABERTURA", "ABERTURA"));
        r.setNaturezaJuridica(valorAposLabel(orig, norm, "NATUREZA JURIDICA"));
        r.setCnaePrincipal(extrairCnae(orig, norm));
        preencherEndereco(texto, orig, norm, r);
    }

    private void parseContratoSocial(String texto, String[] orig, String[] norm, CadastroOcrResponse r) {
        r.setCnpj(extrairCnpj(texto, r));
        r.setRazaoSocial(limparNome(valorAposLabel(orig, norm, "RAZAO SOCIAL", "DENOMINACAO", "NOME EMPRESARIAL")));
        r.setCapitalSocial(extrairCapitalSocial(texto));
        r.setSocios(extrairSocios(orig, norm));
        preencherEndereco(texto, orig, norm, r);
    }

    // ───────────────────────── Extratores ─────────────────────────

    private String extrairCpf(String texto, CadastroOcrResponse r) {
        Matcher m = CPF.matcher(texto);
        while (m.find()) {
            String cpf = MaskUtil.somenteDigitos(m.group());
            if (CpfCnpjValidator.isValidCpf(cpf)) {
                return MaskUtil.cpf(cpf);
            }
        }
        // Achou algo com cara de CPF mas inválido → devolve mascarado e marca revisão.
        m.reset();
        if (m.find()) {
            r.marcarBaixaConfianca("cpf");
            r.addAviso("CPF extraído não passou na validação dos dígitos verificadores.");
            return MaskUtil.cpf(m.group());
        }
        return null;
    }

    private String extrairCnpj(String texto, CadastroOcrResponse r) {
        Matcher m = CNPJ.matcher(texto);
        while (m.find()) {
            String cnpj = MaskUtil.somenteDigitos(m.group());
            if (CpfCnpjValidator.isValidCnpj(cnpj)) {
                return MaskUtil.cnpj(cnpj);
            }
        }
        m.reset();
        if (m.find()) {
            r.marcarBaixaConfianca("cnpj");
            r.addAviso("CNPJ extraído não passou na validação dos dígitos verificadores.");
            return MaskUtil.cnpj(m.group());
        }
        return null;
    }

    private String extrairCnae(String[] orig, String[] norm) {
        for (int i = 0; i < norm.length; i++) {
            if (norm[i].contains("ATIVIDADE ECONOMICA PRINCIPAL")) {
                // O código costuma estar na própria linha ou na seguinte.
                for (int j = i; j < Math.min(i + 2, orig.length); j++) {
                    Matcher m = CNAE.matcher(orig[j]);
                    if (m.find()) {
                        String descricao = orig[j].substring(m.end()).replaceAll("^[\\s\\-]+", "").trim();
                        return descricao.isEmpty() ? m.group() : m.group() + " - " + descricao;
                    }
                }
            }
        }
        return null;
    }

    private String extrairCapitalSocial(String texto) {
        String norm = normalizar(texto);
        int idx = norm.indexOf("CAPITAL SOCIAL");
        if (idx < 0) return null;
        String trecho = texto.substring(Math.min(idx, texto.length()));
        Matcher m = VALOR.matcher(trecho);
        if (m.find()) return "R$ " + m.group(1);
        return null;
    }

    private List<SocioDto> extrairSocios(String[] orig, String[] norm) {
        List<SocioDto> socios = new ArrayList<>();
        for (int i = 0; i < norm.length; i++) {
            boolean linhaSocio = norm[i].contains("SOCIO") || norm[i].contains("ADMINISTRADOR")
                    || norm[i].contains("CPF");
            Matcher cpfM = CPF.matcher(orig[i]);
            if (linhaSocio && cpfM.find()) {
                String cpf = MaskUtil.somenteDigitos(cpfM.group());
                if (!CpfCnpjValidator.isValidCpf(cpf)) continue;
                String nome = limparNome(orig[i].substring(0, cpfM.start()));
                if (nome == null && i > 0) nome = limparNome(orig[i - 1]);

                Matcher partM = Pattern.compile("(\\d{1,3}(?:[.,]\\d+)?)\\s*%").matcher(orig[i]);
                String participacao = partM.find() ? partM.group(1) + "%" : null;

                socios.add(SocioDto.builder().nome(nome).cpf(MaskUtil.cpf(cpf)).participacao(participacao).build());
            }
        }
        return socios;
    }

    /** Preenche CEP, logradouro, número, bairro, cidade e UF a partir do texto. */
    private void preencherEndereco(String texto, String[] orig, String[] norm, CadastroOcrResponse r) {
        Matcher cepM = CEP.matcher(texto);
        if (cepM.find()) r.setCep(MaskUtil.cep(cepM.group()));

        String logradouro = valorAposLabel(orig, norm, "LOGRADOURO", "ENDERECO", "RUA", "AVENIDA");
        r.setLogradouro(logradouro);
        r.setNumero(valorAposLabel(orig, norm, "NUMERO"));
        r.setBairro(valorAposLabel(orig, norm, "BAIRRO", "DISTRITO"));
        r.setCidade(valorAposLabel(orig, norm, "MUNICIPIO", "CIDADE"));
        r.setEstado(extrairUf(orig, norm));

        // Número embutido no logradouro ("Rua X, 123").
        if (r.getNumero() == null && logradouro != null) {
            Matcher numM = Pattern.compile(",\\s*(\\d{1,6})").matcher(logradouro);
            if (numM.find()) r.setNumero(numM.group(1));
        }
    }

    private String extrairUf(String[] orig, String[] norm) {
        String porLabel = valorAposLabel(orig, norm, "UF", "ESTADO");
        if (porLabel != null) {
            String candidato = porLabel.trim().toUpperCase();
            if (UFS.contains(candidato)) return candidato;
        }
        // Procura uma sigla isolada de UF em qualquer linha.
        for (String linha : orig) {
            Matcher m = Pattern.compile("\\b([A-Z]{2})\\b").matcher(linha.toUpperCase());
            while (m.find()) {
                if (UFS.contains(m.group(1))) return m.group(1);
            }
        }
        return null;
    }

    private String[] extrairFiliacao(String[] orig, String[] norm) {
        String mae = null;
        String pai = null;
        for (int i = 0; i < norm.length; i++) {
            if (norm[i].contains("FILIACAO")) {
                // As duas linhas seguintes costumam ser pai e mãe (ordem varia; mãe normalmente por último).
                List<String> nomes = new ArrayList<>();
                String inline = limparNome(orig[i].replaceAll("(?i)filia[cç][aã]o", ""));
                if (inline != null) nomes.add(inline);
                for (int j = i + 1; j < orig.length && nomes.size() < 2; j++) {
                    String nome = limparNome(orig[j]);
                    if (nome != null && nome.split("\\s+").length >= 2) nomes.add(nome);
                    else if (!nomes.isEmpty()) break;
                }
                if (nomes.size() == 1) {
                    mae = nomes.get(0);
                } else if (nomes.size() >= 2) {
                    pai = nomes.get(0);
                    mae = nomes.get(1);
                }
                break;
            }
            if (norm[i].startsWith("MAE") || norm[i].contains("NOME DA MAE")) {
                mae = limparNome(valorAposLabel(orig, norm, "NOME DA MAE", "MAE"));
            }
            if (norm[i].startsWith("PAI") || norm[i].contains("NOME DO PAI")) {
                pai = limparNome(valorAposLabel(orig, norm, "NOME DO PAI", "PAI"));
            }
        }
        return new String[]{mae, pai};
    }

    private void verificarValidadeCnh(String[] orig, String[] norm, CadastroOcrResponse r) {
        String validade = primeiraDataLabel(orig, norm, "VALIDADE", "VAL");
        if (validade == null) return;
        try {
            LocalDate venc = LocalDate.parse(validade, BR_DATE);
            if (venc.isBefore(LocalDate.now())) {
                r.addAviso("CNH vencida em " + validade + ".");
                r.marcarBaixaConfianca("cnhValidade");
            }
        } catch (Exception ignored) {
            // data ilegível
        }
    }

    // ───────────────────────── Helpers de texto ─────────────────────────

    /**
     * Procura a primeira linha que contenha um dos rótulos e devolve o texto que vem depois
     * do rótulo na mesma linha; se nada sobrar, devolve a próxima linha não-vazia.
     */
    private String valorAposLabel(String[] orig, String[] norm, String... labels) {
        for (int i = 0; i < norm.length; i++) {
            for (String label : labels) {
                String labelNorm = normalizar(label);
                int idx = norm[i].indexOf(labelNorm);
                if (idx >= 0) {
                    String resto = orig[i].substring(Math.min(idx + label.length(), orig[i].length()))
                            .replaceAll("^[\\s:\\-]+", "").trim();
                    if (!resto.isEmpty()) return resto;
                    for (int j = i + 1; j < orig.length; j++) {
                        if (!orig[j].trim().isEmpty()) return orig[j].trim();
                    }
                }
            }
        }
        return null;
    }

    private String primeiraDataLabel(String[] orig, String[] norm, String... labels) {
        String valor = valorAposLabel(orig, norm, labels);
        if (valor != null) {
            Matcher m = DATA.matcher(valor);
            if (m.find()) return m.group();
        }
        return null;
    }

    /** Remove pontuação/dígitos de um nome próprio e normaliza espaços. Devolve null se vazio. */
    private String limparNome(String bruto) {
        if (bruto == null) return null;
        String limpo = bruto.replaceAll("[0-9]", " ")
                .replaceAll("[^\\p{L}\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return limpo.isEmpty() ? null : limpo.toUpperCase();
    }

    private String normalizar(String s) {
        if (s == null) return "";
        String semAcento = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return semAcento.toUpperCase().trim();
    }

    // ───────────────────────── Confiança ─────────────────────────

    private void calcularConfianca(CadastroOcrResponse r, TipoPessoa tipoPessoa, TipoDocumento tipoDocumento) {
        List<String> esperados = camposEsperados(tipoDocumento);
        int preenchidos = 0;
        for (String campo : esperados) {
            if (campoPreenchido(r, campo)) {
                preenchidos++;
            } else {
                r.marcarBaixaConfianca(campo);
            }
        }
        int confidence = esperados.isEmpty() ? 0 : Math.round(100f * preenchidos / esperados.size());
        // Penaliza campos extraídos porém inválidos (já adicionados a camposComBaixaConfianca).
        r.setConfidence(Math.max(0, Math.min(100, confidence)));
    }

    private List<String> camposEsperados(TipoDocumento tipo) {
        return switch (tipo) {
            case CNH -> List.of("nomeCompleto", "cpf", "dataNascimento", "nomeMae", "rg");
            case RG -> List.of("nomeCompleto", "rg", "dataNascimento", "nomeMae", "nomePai");
            case COMPROVANTE_ENDERECO -> List.of("cep", "logradouro", "bairro", "cidade", "estado");
            case CNPJ -> List.of("cnpj", "razaoSocial", "nomeFantasia", "dataAbertura", "naturezaJuridica", "cnaePrincipal");
            case CONTRATO_SOCIAL -> List.of("razaoSocial", "cnpj", "capitalSocial");
        };
    }

    private boolean campoPreenchido(CadastroOcrResponse r, String campo) {
        return switch (campo) {
            case "nomeCompleto" -> isFilled(r.getNomeCompleto());
            case "cpf" -> isFilled(r.getCpf()) && !r.getCamposComBaixaConfianca().contains("cpf");
            case "cnpj" -> isFilled(r.getCnpj()) && !r.getCamposComBaixaConfianca().contains("cnpj");
            case "rg" -> isFilled(r.getRg());
            case "dataNascimento" -> isFilled(r.getDataNascimento());
            case "nomeMae" -> isFilled(r.getNomeMae());
            case "nomePai" -> isFilled(r.getNomePai());
            case "cep" -> isFilled(r.getCep());
            case "logradouro" -> isFilled(r.getLogradouro());
            case "bairro" -> isFilled(r.getBairro());
            case "cidade" -> isFilled(r.getCidade());
            case "estado" -> isFilled(r.getEstado());
            case "razaoSocial" -> isFilled(r.getRazaoSocial());
            case "nomeFantasia" -> isFilled(r.getNomeFantasia());
            case "dataAbertura" -> isFilled(r.getDataAbertura());
            case "naturezaJuridica" -> isFilled(r.getNaturezaJuridica());
            case "cnaePrincipal" -> isFilled(r.getCnaePrincipal());
            case "capitalSocial" -> isFilled(r.getCapitalSocial());
            default -> false;
        };
    }

    private boolean isFilled(String s) {
        return s != null && !s.isBlank();
    }
}
