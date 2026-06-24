export const environment = {
  production: false,
  apiUrl: '/api/v1',
  appName: 'Bear ERP',
  version: '1.0.0',
  appwrite: {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '69b52c570036d92459ce',
    databaseId: '69b52c820006ab36b33a',
    // Bucket privado dos .pfx do certificado A1 (cofre).
    certBucketId: 'certificados-a1',
    // Chave AES-256 (base64) p/ cifrar a senha do .pfx antes de gravar no banco.
    // NOTA: por estar no bundle do frontend, protege contra vazamento só do
    // banco — não é segredo absoluto. Deve ser a MESMA do CERT_VAULT_KEY das
    // Functions. Endurecer depois movendo a cifragem p/ uma Function.
    certVaultKey: 'CJMDFGSZSue8ycXYxgLV4cF7rOhj0fBa150njWCjWDM=',
    functions: {
      // IDs das Appwrite Functions (ajustar conforme o ID gerado no deploy).
      // CPF e CNPJ atendidos pela mesma função (limite de funções do plano Appwrite).
      consultaCpf: 'consulta-cnpj',
      consultaCnpj: 'consulta-cnpj',
      ocrCadastro: 'ocr-cadastro',
    },
  },
};
