package br.com.bearerp.integracoesservice.infrastructure.ocr.cadastro;

/**
 * Tipos de documento aceitos no fluxo de "Novo cadastro".
 *
 * Pessoa Física: CNH, RG, COMPROVANTE_ENDERECO.
 * Pessoa Jurídica: CNPJ (cartão CNPJ), CONTRATO_SOCIAL, COMPROVANTE_ENDERECO.
 */
public enum TipoDocumento {
    CNH,
    RG,
    COMPROVANTE_ENDERECO,
    CNPJ,
    CONTRATO_SOCIAL
}
