export const environment = {
  production: false,
  apiUrl: '/api/v1',
  appName: 'Bear ERP',
  version: '1.0.0',
  appwrite: {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '69b52c570036d92459ce',
    databaseId: '69b52c820006ab36b33a',
    functions: {
      // ID da Appwrite Function `consulta-cpf-hub` (preencher após o deploy).
      consultaCpf: 'consulta-cpf-hub',
    },
  },
};
