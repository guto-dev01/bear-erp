# fiscal_sefaz — Integração SEFAZ (NFeDistribuicaoDFe)

Módulo **Python isolado** que implementa a consulta oficial de documentos fiscais
eletrônicos na SEFAZ via serviço **NFeDistribuicaoDFe** (`distNSU`), com
certificado digital **A1**, **mTLS**, **SOAP 1.2**, controle de **NSU** e
processamento de **docZip** (Base64 + GZip).

> Vive **fora** do frontend Angular (`bear2`). O Angular **não** faz a consulta
> SOAP — ele chama um worker/serviço que usa este módulo. Isto atende à
> exigência da especificação: *"worker separado"* / *"não executar SOAP no
> frontend"*.

## Por que Python, e como se encaixa

O app do `bear2` roda no navegador (Angular). Python roda como processo
separado. A arquitetura pretendida:

```
[Angular: página Importar NF-e]
        │  HTTP (Sincronizar agora / Testar certificado)
        ▼
[API/worker do seu backend]  ──usa──►  fiscal_sefaz  ──mTLS/SOAP──►  SEFAZ (AN)
        │                                   │
        └── grava em: fiscal_sync_states, fiscal_documents, ...  (camada de persistência)
```

Este pacote entrega a **lógica de integração pura e testável**. A camada de
persistência (Appwrite/DB), a fila e o lock por empresa são plugados por quem
consome o módulo — ele **não** conhece o banco de propósito.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `config.py` | Ambientes (homologação/produção), endpoints AN, mapa UF→cUF, versão do leiaute. |
| `certificado.py` | Carga/validação do A1 (.pfx/.p12); extrai CNPJ (SAN ICP-Brasil), validade, emissor; material mTLS temporário (0600). |
| `distribuicao.py` | **A função** `consultar_distribuicao(...)`: monta SOAP, faz mTLS, interpreta `retDistDFeInt`. |
| `docparser.py` | docZip → Base64/GZip → XML → tipo → hash; parse de `resNFe`/`procNFe`/`resEvento`/`procEventoNFe`. |
| `nsu.py` | Controle de NSU por empresa (puro): avança só após persistir, nunca reinicia, backoff. |
| `errors.py` | Exceções de domínio + interpretação de `cStat` (137/138/**656**). |
| `models.py` | Dataclasses de resultado (sem framework). |
| `cli.py` | CLI de dev (`inspect`, `sync`). |
| `tests/` | 31 testes offline (fixtures sintéticas, A1 auto-assinado). |

## Instalação

```bash
cd bear2/fiscal_sefaz
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```
(As libs `requests`, `lxml`, `cryptography` já estavam presentes neste ambiente.)

## Uso

### Validar um certificado A1 (não envia nada à SEFAZ)
```bash
python -m fiscal_sefaz.cli inspect --pfx empresa.pfx --senha '***' --cnpj-empresa 12345678000199
```

### Consulta real (exige A1 válido + acesso à SEFAZ)
```bash
python -m fiscal_sefaz.cli sync --pfx empresa.pfx --senha '***' \
  --cnpj 12345678000199 --uf SP --ambiente homologacao --ult-nsu 0
```

### Como função (o worker chama assim)
```python
from fiscal_sefaz import Ambiente
from fiscal_sefaz.distribuicao import consultar_distribuicao
from fiscal_sefaz.nsu import EstadoNsu, avancar_apos_persistir

res = consultar_distribuicao(
    cnpj="12345678000199", uf="SP", ambiente=Ambiente.HOMOLOGACAO,
    ult_nsu=estado.last_nsu, pfx_bytes=pfx, senha=senha, cnpj_empresa="12345678000199",
)
# 1) persista res.documentos (XML privado + metadados), impedindo duplicidade
# 2) só então avance o NSU:
novo_estado = avancar_apos_persistir(estado, res)
```

## API HTTP (api.py) e deploy no Render

O `api.py` expõe o módulo ao frontend (`/health`, `/sefaz/testar-certificado`,
`/sefaz/sincronizar`). Local:

```bash
uvicorn fiscal_sefaz.api:app --host 127.0.0.1 --port 8770
```

Hospedado no **Render**: o blueprint [`render.yaml`](../render.yaml) na raiz do
repo cria o serviço `bear-fiscal-sefaz` (Dashboard → New → Blueprint). O Angular
lê a URL de `environment.sefazWorkerUrl` (dev: `localhost:8770`; prod: a URL do
Render).

- **CORS**: `localhost`/LAN `:4200` sempre liberados; frontend hospedado entra
  pela env `CORS_ORIGINS` (origens separadas por vírgula).
- **Plano free**: o serviço hiberna após ~15 min ocioso e a primeira requisição
  leva ~50 s. O `healthCheckPath: /health` já está configurado.
- O worker continua **stateless**: pfx/senha só em memória, por requisição.

## Segurança (garantida pelo módulo)

- Senha e material do certificado **só em memória**; PEM temporário para o mTLS
  é criado com permissão **0600** e removido no `finally`.
- Nada de senha/chave/segredo em logs ou em exceções voltadas ao usuário.
- `InfoCertificado.to_public_dict()` **nunca** inclui senha/chave.
- Mensagens de erro amigáveis (`SefazError.mensagem_usuario`) — sem stack trace,
  caminho interno ou conteúdo sensível.

## Controle de NSU (regras aplicadas)

- 1ª sync parte de `000000000000000`; seguintes usam o último NSU salvo.
- **Nunca reinicia** o NSU; **nunca avança** antes de persistir (função separada
  `avancar_apos_persistir`, chamada só após gravar o lote).
- `ultNSU == maxNSU` → encerra o ciclo e agenda a próxima sync.
- **cStat 656 (consumo indevido)** → não avança, aplica backoff (1h).

## O que ESTE módulo faz / não faz

**Faz:** SOAP+mTLS do NFeDistribuicaoDFe (distNSU), parsing de retDistDFeInt,
docZip (resNFe/procNFe/resEvento/procEventoNFe), hash, validação de A1, decisão
de NSU/backoff, tratamento de erros.

**Não faz (fica na camada de quem consome):** persistência (tabelas
`company_certificates`, `fiscal_sync_states`, `fiscal_documents`, …), fila +
lock por empresa, criptografia-em-repouso do .pfx/senha (o módulo só usa o A1
em memória), storage privado do XML, auditoria e permissões. A arquitetura já
está preparada para esses plugues.

## Testes

```bash
python -m pytest fiscal_sefaz/tests -q     # 33 passed
```
Os testes são 100% offline: geram docZip/SOAP sintéticos e um A1 auto-assinado
com o CNPJ no SAN ICP-Brasil. **Nenhum certificado real é versionado.**

## Ambiente

- `--ambiente homologacao|producao` (default: `homologacao`). A produção usa o
  endpoint AN `www1.nfe.fazenda.gov.br`; homologação, `hom1.nfe.fazenda.gov.br`.
- **Cuidado**: não deixe homologação habilitada por engano em produção — o
  ambiente é sempre explícito na chamada.
