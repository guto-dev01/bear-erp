# Integrações Gov — Appwrite Functions (Node.js)

Camada isolada de integração com plataformas do governo. O **eSocial é o núcleo**;
FGTS Digital, DCTFWeb e SST orbitam em torno dele. O navegador **nunca** assina
nem transmite — só chama a Function, que faz SOAP/XMLDSig/TLS server-side e grava
o estado nas coleções do Appwrite.

> **Status: Etapa 2 (fundação).** Nada é enviado ao governo ainda — isso é a
> Etapa 3. Aqui estão prontos: serviço de certificado, cofre, chaveamento de
> ambiente e preparação do trust store Sectigo.

## Estrutura

```
functions/
  _shared/                       # lib comum a todas as functions
    config/environment.js        # produção restrita ↔ produção (por env)
    cofre/                       # CofreCertificado (interface) + adaptadores
      appwrite-storage-vault.js  #   .pfx em bucket privado; senha em env/secret
      memoria-vault.js           #   adaptador de teste
    certificado/                 # leitura PKCS#12 + metadados + vencimento
    soap/truststore-sectigo.js   # cadeia Sectigo (R4 + CA OV R36) p/ TLS 2026
    soap/certs/                  # .pem reais (NÃO versionados) — ver README de lá
    log/logger.js                # log estruturado c/ máscara de CPF/PIS (LGPD)
    __tests__/                   # node:test (sem rede; .pfx autoassinado em memória)
```

## Rodar os testes

```bash
cd functions
npm install
npm test
```

## Configuração por ambiente (sem recompilar)

| Variável | Default | Função |
|---|---|---|
| `ESOCIAL_AMBIENTE` | `2` (restrita) | `1`=produção, `2`=produção restrita |
| `ESOCIAL_VERSAO_LEIAUTE` | `S-1.3` | versão do leiaute (governo sobe versões) |
| `CERT_DIAS_ALERTA_VENCIMENTO` | `30` | antecedência do alerta de vencimento |
| `CERT_BUCKET_ID` | `certificados-a1` | bucket do cofre |
| `CERT_SENHA_<EMPRESAID>` / `CERT_SENHA` | — | **senha do A1** (nunca no banco) |
| `SECTIGO_TRUSTSTORE_DIR` / `NODE_EXTRA_CA_CERTS` | `_shared/soap/certs` | cadeia TLS Sectigo |

> O default é **sempre produção restrita**: um deploy sem `ESOCIAL_AMBIENTE`
> jamais transmite ao ambiente real por acidente.

## Migração de banco

```bash
# cria o bucket privado `certificados-a1` e estende `certificados`/`eventos_esocial`
node scripts/migrations/2026-etapa2-certificado-esocial.js
```

## Certificado de teste (produção restrita)

```bash
node scripts/gen-test-cert.js ./cert-teste.pfx teste123 "EMPRESA TESTE LTDA:12345678000199"
# arquivo *.pfx está no .gitignore — não será versionado
```

Suba o `.pfx` ao bucket `certificados-a1`, grave o `storageFileId` no documento
da coleção `certificados` da empresa, e configure a senha em `CERT_SENHA_<id>`.

## Pendente de configuração externa

- **Certificado A1 e-CNPJ real** (PKCS#12) + senha — injetados só por ambiente.
- **Acesso à produção restrita do eSocial** (habilitação do empregador/escritório).
- **Cadeia TLS Sectigo** (`Root R4` + `CA OV R36`) — ver `_shared/soap/certs/README.md`.
- **DCTFWeb (Etapa 7):** contratação da API Integra Contador (SERPRO).
