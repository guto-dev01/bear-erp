package br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro;

/**
 * Aplicação de máscaras nos dados extraídos (CPF, CNPJ, CEP, telefone, datas).
 * Opera sobre os dígitos do valor; se o tamanho não bater, devolve o valor original limpo.
 */
public final class MaskUtil {

    private MaskUtil() {}

    public static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    /** 000.000.000-00 */
    public static String cpf(String valor) {
        String d = somenteDigitos(valor);
        if (d.length() != 11) return d;
        return d.replaceFirst("(\\d{3})(\\d{3})(\\d{3})(\\d{2})", "$1.$2.$3-$4");
    }

    /** 00.000.000/0000-00 */
    public static String cnpj(String valor) {
        String d = somenteDigitos(valor);
        if (d.length() != 14) return d;
        return d.replaceFirst("(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})", "$1.$2.$3/$4-$5");
    }

    /** 00000-000 */
    public static String cep(String valor) {
        String d = somenteDigitos(valor);
        if (d.length() != 8) return d;
        return d.replaceFirst("(\\d{5})(\\d{3})", "$1-$2");
    }

    /** (00) 0000-0000 ou (00) 00000-0000 */
    public static String telefone(String valor) {
        String d = somenteDigitos(valor);
        if (d.length() == 11) return d.replaceFirst("(\\d{2})(\\d{5})(\\d{4})", "($1) $2-$3");
        if (d.length() == 10) return d.replaceFirst("(\\d{2})(\\d{4})(\\d{4})", "($1) $2-$3");
        return d;
    }

    /** dd/MM/yyyy a partir de 8 dígitos. */
    public static String data(String valor) {
        String d = somenteDigitos(valor);
        if (d.length() != 8) return valor == null ? null : valor.trim();
        return d.replaceFirst("(\\d{2})(\\d{2})(\\d{4})", "$1/$2/$3");
    }
}
