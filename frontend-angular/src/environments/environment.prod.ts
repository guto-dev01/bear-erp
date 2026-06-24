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
      ocrCadastro: 'ocr-cadastro',
    },
  },
};
