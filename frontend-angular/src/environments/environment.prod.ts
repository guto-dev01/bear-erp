export const environment = {
  production: true,
  apiUrl: '/api/v1',
  appName: 'Bear ERP',
  version: '1.0.0',
  appwrite: {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '69b52c570036d92459ce',
    databaseId: '69b52c820006ab36b33a',
    functions: {
      // IDs das Appwrite Functions (ajustar conforme o ID gerado no deploy).
      // CPF e CNPJ atendidos pela mesma função (limite de funções do plano Appwrite).
      consultaCpf: 'consulta-cnpj',
      consultaCnpj: 'consulta-cnpj',
      ocrCadastro: 'ocr-cadastro', // obsoleto: OCR roda no navegador; slot reaproveitado abaixo
      // Upload do A1 reaproveita o slot 'ocr-cadastro' (limite de funções do plano).
      certificadoUpload: 'ocr-cadastro',
      // Transmissão da NF-e à SEFAZ (assina A1 do cofre + mTLS). Reaproveita o slot
      // do cofre (ocr-cadastro) via dispatcher functions/fiscal-cofre — limite de
      // funções do plano Appwrite. Ver scripts/deploy-nfe-transmissao.js.
      nfeTransmissao: 'ocr-cadastro',
      // Entrada de NF-e (Distribuição DF-e + Manifestação) — mesmo slot; a
      // operação ('distribuir'/'manifestar') é roteada em nfe-transmissao/index.js.
      nfeDistribuicao: 'ocr-cadastro',
    },
  },
};
