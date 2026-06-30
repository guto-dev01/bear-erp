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
      eventos/                     # 1 arquivo por evento (builder → { id, xml, alias })
        s1000.js  s1010.js         #   tabelas: Inf. Empregador, Rubricas
        s1200.js  s1210.js  s1299.js  # periódicos: remuneração, pagamentos, fechamento
        s2200.js  s2206.js  s2230.js  s2299.js  # vínculo: admissão, alt., afast., deslig.
        s3000.js                   #   correção: exclusão de evento
        sst/s2210.js  sst/s2220.js  sst/s2240.js  # SST: CAT, ASO/saúde, agentes nocivos
      qualificacao/                # CPF × NIS/PIS × nome (pré-validação + WS oficial)
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

- **esocial-qualificacao-cadastral** — recebe `{ cpf, nome, nis, dtNascto? }` e
  devolve `{ ok, local, oficial }`. `local` é a pré-validação determinística
  (DV de CPF e NIS/PIS + consistência do nome); `oficial` é a consulta ao
  webservice oficial de Qualificação Cadastral, hoje **pendente de habilitação**
  (sem `ESOCIAL_QUALIF_WS_URL` retorna `{ disponivel: false, pendente: true }` —
  nunca finge validação). Lógica pura e testada em
  `_shared/esocial/qualificacao/qualificacao-cadastral.js` (regra portada do
  legado Java `EsocialPainelService.qualificarCadastro`, reforçada com o DV do
  NIS). Entrypoint `esocial-qualificacao-cadastral/index.js`, mesmo
  `rootDirectory` (`functions/`).

## Catálogo de eventos do eSocial (motor genérico)

Cada evento é um **builder puro** em `_shared/esocial/eventos/`, no mesmo padrão
do `s1000.js`: recebe `dados` + `opts`, valida campos obrigatórios em JS, monta o
XML **sem assinatura** (via `el()`/`gerarId()`/`nsEvento()`) e devolve
`{ id, xml, alias }`. A assinatura, o lote e o transporte são aplicados pelo
motor (genérico, **intocado**). O registro está em `transmissao.js → MONTADORES`,
indexado por `tipoEvento`; é assim que a Function `esocial-enviar-lote` despacha.

| Evento | alias | Builder | Grupo |
|---|---|---|---|
| S-1000 | evtInfoEmpregador | `eventos/s1000.js` | tabela |
| S-1010 | evtTabRubrica | `eventos/s1010.js` | tabela |
| S-1200 | evtRemun | `eventos/s1200.js` | periódico |
| S-1210 | evtPgtos | `eventos/s1210.js` | periódico |
| S-1299 | evtFechaEvPer | `eventos/s1299.js` | periódico |
| S-2200 | evtAdmissao | `eventos/s2200.js` | não-periódico |
| S-2206 | evtAltContratual | `eventos/s2206.js` | não-periódico |
| S-2210 | evtCAT | `eventos/sst/s2210.js` | não-periódico (SST) |
| S-2220 | evtMonit | `eventos/sst/s2220.js` | não-periódico (SST) |
| S-2230 | evtAfastTemp | `eventos/s2230.js` | não-periódico |
| S-2240 | evtExpRisco | `eventos/sst/s2240.js` | não-periódico (SST) |
| S-2299 | evtDeslig | `eventos/s2299.js` | não-periódico |
| S-3000 | evtExclusao | `eventos/s3000.js` | correção |

**Persistência.** Os eventos são gravados na coleção canônica `eventos_esocial`
(via `repositorio.js`), indexada por `tipoEvento` e já carregando
`empresaId`/`tenantId`/estado/`payloadXml`. Coleções de **detalhe** por evento
(`esocial_sXXXX`) são opcionais para consulta; hoje só `esocial_s2210` existe em
`scripts/appwrite-setup.js`. As demais (`esocial_s1010`, `esocial_s1200`,
`esocial_s1210`, `esocial_s2200`, `esocial_s2230`, `esocial_s2240`,
`esocial_s1299`, `esocial_s3000`, …) **ainda não foram criadas** — ficam como
migração pendente, sem bloquear a transmissão (que usa `eventos_esocial`).

## Function de consulta de CPF (Hub do Desenvolvedor) — DEPRECADA

> **Deprecada.** A consulta de CPF migrou para o backend Java
> (`integracoes-service` → `GET /api/v1/integracoes/cpf/{cpf}`), acessível pelo
> api-gateway com validação de JWT do Appwrite. O frontend (Funcionários) chama
> o gateway, não mais esta function. Mantida como fallback; a lógica de
> normalização (`_shared/hub/consulta-cpf.js`) foi portada para
> `ConsultaCpfService.java`.

- **consulta-cpf-hub** — recebe `{ cpf, dataNascimento? }`, consulta os dados da
  pessoa física no Hub do Desenvolvedor e devolve `{ ok, cpf, normalizado, bruto }`.
  O token (`CPF_API_TOKEN`) fica **só na Function** — o navegador nunca o vê.
  Lógica pura e testada em `_shared/hub/consulta-cpf.js` (CPF validado, resposta
  normalizada, payload bruto preservado). O frontend chama via
  `AppwriteService.executeFunction(env.appwrite.functions.consultaCpf, { cpf })`.

| Variável | Default | Função |
|---|---|---|
| `CPF_API_TOKEN` | — | **obrigatória** — token do Hub do Desenvolvedor |
| `CPF_API_URL` | `https://ws.hubdodesenvolvedor.com.br/v2/cpf/` | endpoint base do Hub |

> Entrypoint `consulta-cpf-hub/index.js`, mesmo `rootDirectory` (`functions/`).
> Configure `CPF_API_TOKEN` nas variáveis da Function no console do Appwrite
> (o valor está no `.env` local, **não** no repositório).

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
| `CERT_MASTER_KEY` | — | **chave mestra (32 bytes base64/hex)** do cofre de senhas (AES-256-GCM). Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `CERT_SENHA_<EMPRESAID>` / `CERT_SENHA` | — | senha do A1 em env — **fallback de teste/legado**; produção usa `senhaCofre` cifrado |
| `SECTIGO_TRUSTSTORE_DIR` / `NODE_EXTRA_CA_CERTS` | `_shared/soap/certs` | cadeia TLS Sectigo |

> O default é **sempre produção restrita**: um deploy sem `ESOCIAL_AMBIENTE`
> jamais transmite ao ambiente real por acidente.

## Isolamento multi-tenant por Teams (Etapa 3)

Cada **escritório (tenant) é um Appwrite Team** cujo id É o `tenantId`. As
coleções têm `documentSecurity` **ligado** e cada documento nasce com
`read/update/delete` para `Role.team(tenantId)`; no nível da coleção fica só
`create` para `Role.users()`. Resultado: um usuário só enxerga os documentos do
seu escritório — não há mais o `Role.users()` que liberava tudo a qualquer
logado.

- **Frontend:** o wrapper `AppwriteService.createDocument` carimba as permissões
  do tenant da sessão automaticamente (lógica em `core/auth/session-context.ts`);
  o onboarding (`multi-tenancy.component`) cria o Team e o criador entra como
  **owner**. Helpers `criarEscritorioTeam` / `convidarMembro` / `permissoesTenant`.
- **Regra pura e testada:** `_shared/tenant/permissoes.js` (monta/compara as
  permissões) — reusada pelo upload e pela migração.
- Tabelas de **referência globais** (`tabela_inss/irrf/simples`) ficam legíveis
  por todos os tenants (não são escopadas por Team).

## Cofre do A1: upload + senha cifrada (Etapa 3)

- **Function `certificado-upload`** — recebe `{ empresaId, tenantId, pfxBase64,
  senha, nomeArquivo? }`. Abre o PKCS#12 (valida a senha), confere o **CNPJ do
  certificado × CNPJ da empresa**, recusa **vencido**, grava o `.pfx` no bucket
  privado, **cifra a senha** (AES-256-GCM, `CERT_MASTER_KEY`) e guarda só o
  ciphertext em `certificados.senhaCofre`, vincula `empresa.certificadoDigitalId`
  (documento escopado por Team) e registra em `audit_logs`. Regra pura e testada
  em `_shared/certificado/upload-certificado.js`; cripto em `_shared/cripto/segredo.js`.
- **Senha nunca em claro:** não vai para o navegador (sem localStorage) nem para
  o banco. O `AppwriteStorageVault` agora **decifra** `senhaCofre` com a chave
  mestra; o `CERT_SENHA_<id>` em env vira só fallback de teste/legado.
- Variáveis da Function: `APPWRITE_DB_ID`, `CERT_BUCKET_ID`, **`CERT_MASTER_KEY`**,
  e a API key (header `x-appwrite-key`). Permissão de execução: **Users**.

## Migração de banco

```bash
# Etapa 2 — bucket privado + campos de certificado/eSocial
node scripts/migrations/2026-etapa2-certificado-esocial.js

# Etapa 3 — isolamento multi-tenant (Teams + documentSecurity + backfill de permissões)
#   API key precisa de teams.write, users.read e databases.write.
node scripts/migrations/2026-etapa3-multitenant-teams.js --so-sensiveis  # valida as sensíveis primeiro
node scripts/migrations/2026-etapa3-multitenant-teams.js                 # depois todas

# Etapa 3 — campo senhaCofre + conversão das senhas em env → ciphertext
node scripts/migrations/2026-etapa3-certificado-senha-cipher.js
```

Detalhes do modelo e da ordem segura: `scripts/README.md`.

## Certificado de teste / A1 real

```bash
node scripts/gen-test-cert.js ./cert-teste.pfx teste123 "EMPRESA TESTE LTDA:12345678000199"
# arquivo *.pfx está no .gitignore — não será versionado
```

Em produção, suba o A1 pela **tela de Certificados → "Enviar Certificado A1"**
(empresa + arquivo + senha) — a Function valida e cifra tudo. Para teste local do
motor eSocial, você ainda pode subir o `.pfx` ao bucket e usar `CERT_SENHA_<id>`.

## Pendente de configuração externa

- **Certificado A1 e-CNPJ real** (PKCS#12) + senha — injetados só por ambiente.
- **Acesso à produção restrita do eSocial** (habilitação do empregador/escritório).
- **Cadeia TLS Sectigo** (`Root R4` + `CA OV R36`) — ver `_shared/soap/certs/README.md`.
- **XSD oficiais do leiaute S-1.3** — a validação local contra XSD (Parte 4) e a
  confirmação dos namespaces de lote/WS (em `namespaces.js`) e nomes de operação
  (em `soap/envelopes.js`) devem ser feitas contra o MOD/WSDL vigentes antes do
  primeiro envio real. **TODOS os builders de evento** (S-1000…S-3000) seguem o
  leiaute documentado e validam por REGRAS em JS, mas a estrutura/ordem/nomes/
  enumerações de cada um **DEVE ser confrontada com o XSD oficial do respectivo
  evento** antes de transmitir — o MOD é a fonte da verdade; nenhum campo foi
  inventado e os opcionais ausentes são omitidos. Blocos extensos modelados pelo
  núcleo (S-1200/S-1210 detalhamento de pagamentos; S-2200 dependentes/sucessão/
  aprendiz; S-2299 verbas/quarentena; S-2240 EPC/EPI) ficam como extensão a
  incorporar junto com o XSD.
- **Webservice de Qualificação Cadastral** (`esocial-qualificacao-cadastral`) —
  endpoint/credencial do serviço oficial (`ESOCIAL_QUALIF_WS_URL` + material de
  certificado para mTLS, conforme o WSDL) **pendente de habilitação**. Enquanto
  isso, só a pré-validação local roda; `consultarOficial()` lança
  `PENDENTE_CONFIG`/`PENDENTE_IMPL` em vez de simular resultado.
- **DCTFWeb (Etapa 7):** contratação da API Integra Contador (SERPRO).
