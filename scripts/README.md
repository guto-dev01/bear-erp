# Banco (Appwrite) — setup, modelo de segurança e migrações

O backend vivo do Bear ERP é o **Appwrite Cloud**. Este diretório provisiona o
banco (`appwrite-setup.js`) e evolui o schema/segurança (`migrations/`).

## Modelo de isolamento multi-tenant (Teams)

Cada **escritório é um Appwrite Team** cujo id **é** o `tenantId`. O isolamento
real entre escritórios é por **permissão de documento**, não por filtro de query:

- Coleções com **`documentSecurity` ligado**.
- **Documento:** nasce com `read/update/delete` para `Role.team(tenantId)`.
- **Coleção:** só `create` para `Role.users()` (qualquer logado cria, mas o
  documento já nasce restrito ao seu Team). **Não há mais** `Role.users()` de
  read/update/delete — era o que vazava tudo entre escritórios.
- **Membros:** o criador do escritório entra como `owner`; colaboradores entram
  com a role do app (`ADMIN`/`CONTADOR`/`AUXILIAR`) no membership. `ADMIN` também
  recebe `owner` (administra o Team).
- **Referência global** (`tabela_inss`, `tabela_irrf`, `tabela_simples`):
  **não** é escopada por Team — fica legível por qualquer logado (`read("users")`),
  só o servidor escreve.
- O bucket `certificados-a1` continua **privado** (sem role pública): o `.pfx` só
  é lido server-side pela API key da Function.

A regra pura (montar/comparar permissões) vive em
`functions/_shared/tenant/permissoes.js` (testada em `node --test`); a parte que
toca a rede (criar Team, adicionar membro, backfill, ligar documentSecurity) em
`scripts/migrations/lib/tenant-teams.js`, reusada pelo setup e pela migração.

## Cofre da senha do A1 (env → ciphertext)

A senha do certificado A1 **não fica em texto puro** em lugar nenhum:

- O `.pfx` vai para o bucket privado.
- A senha é **cifrada com AES-256-GCM** (chave mestra `CERT_MASTER_KEY`, fora do
  banco) e só o ciphertext é gravado em `certificados.senhaCofre`.
- Substitui o esquema `CERT_SENHA_<empresaId>` em env (que não escala para
  milhares de empresas). O env continua valendo só como fallback de teste/legado.

Cripto: `functions/_shared/cripto/segredo.js`. Gere a chave mestra com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Ordem de execução

`.env` da raiz precisa de `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`,
`APPWRITE_API_KEY`, `APPWRITE_DB_ID`. A API key das migrações de Team precisa dos
escopos **`teams.write`, `users.read`, `databases.write`**.

```bash
# 1) Instalação nova: cria coleções, popula dados e JÁ securiza o tenant `default`
node scripts/appwrite-setup.js

# 2) Banco já existente — Etapa 2 (cofre/eSocial)
node scripts/migrations/2026-etapa2-certificado-esocial.js

# 3) Etapa 3 — isolamento multi-tenant (idempotente). Sensíveis primeiro:
node scripts/migrations/2026-etapa3-multitenant-teams.js --so-sensiveis
node scripts/migrations/2026-etapa3-multitenant-teams.js

# 4) Etapa 3 — campo senhaCofre + conversão das senhas em env → ciphertext
CERT_MASTER_KEY=... node scripts/migrations/2026-etapa3-certificado-senha-cipher.js
```

> **Ordem importa:** o backfill de permissões dos documentos roda **antes** de
> ligar `documentSecurity` — senão documentos sem permissão ficariam invisíveis.
> Tudo é **idempotente**: reexecutar não duplica Teams/membros nem reescreve
> permissões já corretas.

## Migrações

| Arquivo | O que faz |
|---|---|
| `migrations/2026-etapa2-certificado-esocial.js` | Bucket privado `certificados-a1` + campos de `certificados`/`eventos_esocial`. |
| `migrations/2026-s2210-cat.js` | Coleção de detalhe `esocial_s2210` (CAT). |
| `migrations/2026-etapa3-multitenant-teams.js` | Cria Teams por tenant, adiciona usuários (por e-mail), backfill de permissões `Role.team(tenantId)` e liga `documentSecurity`. Sensíveis primeiro (`--so-sensiveis`). |
| `migrations/2026-etapa3-certificado-senha-cipher.js` | Campo `certificados.senhaCofre` + conversão `CERT_SENHA_*` (env) → ciphertext. |
| `migrations/lib/tenant-teams.js` | Lib compartilhada (setup + migração): Teams, membros, backfill, securização. |

## Conferir no console do Appwrite

Após a Etapa 3, revise em **Databases → cada coleção → Settings**: `Document
Security` deve estar **ON** e as permissões de coleção devem ter só `Create`
(`users`) — exceto as tabelas de referência globais (`Read` para `users`).
