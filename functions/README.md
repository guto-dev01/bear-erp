# Integrações Gov — Appwrite Functions (Node.js)

Camada isolada de integração com plataformas do governo. O **eSocial é o núcleo**;
FGTS Digital, DCTFWeb e SST orbitam em torno dele. O navegador **nunca** assina
nem transmite — só chama a Function, que faz SOAP/XMLDSig/TLS server-side e grava
o estado nas coleções do Appwrite.

> **Status: Etapa 3 (eSocial — montagem, assinatura, envio e consulta).** O
> pipeline está pronto e testado offline. A transmissão real depende da config
> externa pendente (certificado A1, acesso à produção restrita, cadeia Sectigo).

## Estrutura

```
functions/
  _shared/                         # lib comum a todas as functions
    config/environment.js          # produção restrita ↔ produção (por env)
    cofre/                         # CofreCertificado (interface) + adaptadores
      appwrite-storage-vault.js    #   .pfx em bucket privado; senha em env/secret
      memoria-vault.js             #   adaptador de teste
    certificado/                   # leitura PKCS#12 + metadados + vencimento
    soap/truststore-sectigo.js     # cadeia Sectigo (R4 + CA OV R36) p/ TLS 2026
    soap/certs/                    # .pem reais (NÃO versionados) — ver README de lá
    log/logger.js                  # log estruturado c/ máscara de CPF/PIS (LGPD)
    esocial/
      ids.js                       # Id oficial do evento (36 chars)
      namespaces.js                # namespaces por versão de leiaute
      xml.js                       # builder de XML com escaping
      eventos/s1000.js             # evento de tabela S-1000 (Inf. Empregador)
      assinatura/xmldsig.js        # XMLDSig: enveloped, C14N, SHA-256, X509-only
      lote/monta-lote.js           # envioLoteEventos (1..50)
      soap/                        # envelopes SOAP 1.1, parser, cliente mTLS
      estado/maquina-estado.js     # estados + idempotência + mapa de retorno
      operacoes.js                 # enviarLote / consultarLote (alto nível)
      repositorio.js               # eventos_esocial (Appwrite + memória)
      transmissao.js               # orquestrador: cofre→montar→assinar→enviar→persistir
    __tests__/                     # node:test (sem rede; .pfx autoassinado em memória)
  esocial-enviar-lote/index.js     # Appwrite Function (camada fina)
  esocial-consultar-lote/index.js  # Appwrite Function (camada fina)
```

## Functions do eSocial (Etapa 3)

- **esocial-enviar-lote** — recebe `{ empresaId, grupo, ideEmpregador,
  ideTransmissor, eventos: [{ eventoId, tipoEvento, dados }] }`, monta+assina
  cada evento, envia o lote e grava `protocolo`/`status`/`payloadXml`.
- **esocial-consultar-lote** — recebe `{ empresaId, protocolo, eventoIds }`,
  consulta o processamento e atualiza `status`/`recibo`/`erros`.

> **Deploy:** as functions usam `require('../_shared/...')`. No Appwrite,
> configure o **rootDirectory** da função como `functions/` (entrypoint
> `esocial-enviar-lote/index.js`) ou inclua `_shared/` no pacote de deploy,
> para que a lib compartilhada seja empacotada junto.
>
> Default de ambiente é **produção restrita**. Só vira produção com
> `ESOCIAL_AMBIENTE=1`.

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
- **XSD oficiais do leiaute S-1.3** — a validação local contra XSD (Parte 4) e a
  confirmação dos namespaces de lote/WS (em `namespaces.js`) e nomes de operação
  (em `soap/envelopes.js`) devem ser feitas contra o MOD/WSDL vigentes antes do
  primeiro envio real. A estrutura do S-1000 segue o documentado, mas o MOD é a
  fonte da verdade.
- **DCTFWeb (Etapa 7):** contratação da API Integra Contador (SERPRO).
