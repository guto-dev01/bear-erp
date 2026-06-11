# Migração para Appwrite — Deploy das Functions

As features server-side que o frontend usava no backend Java foram movidas para Appwrite
Functions. Depois deste deploy, o stack Java + MongoDB pode ser desligado.

## Funções (DEPLOYADAS e validadas)

Por causa do **limite de funções do plano Appwrite**, CPF e CNPJ ficam na MESMA função.

| Função | Pasta | Substitui (Java) | Segredo? |
|---|---|---|---|
| `ocr-cadastro` | `functions/ocr-cadastro/` | `POST /api/v1/integracoes/cadastros/ocr` | não |
| `consulta-cnpj` (CPF **e** CNPJ) | `functions/consulta-cnpj/` | `GET /integracoes/cnpj/{cnpj}` e `/cpf/{cpf}` | **sim** p/ CPF (`CPF_API_TOKEN`) |

Roteamento da `consulta-cnpj`: payload `{cnpj}` → BrasilAPI; `{cpf, dataNascimento?}` → Hub.
A `functions/consulta-cpf-hub/` permanece no repo como referência, mas **não é deployada**.

Deploy automatizado: `node scripts/appwrite-deploy-functions.js` (usa API key com escopo
`functions.write`). Runtime **Node 18**. Lógica pura em `functions/_shared/`. OCR: `tesseract.js` + `pdf-parse`.

> **Atenção CPF:** o token do Hub (`CPF_API_TOKEN`) precisa ser válido e com saldo. No deploy
> atual a consulta de CPF retornou "Token Inválido ou sem saldo" — atualize o token no `.env`
> e rode `node scripts/appwrite-deploy-functions.js consulta-cnpj` de novo.

## Passos

1. **Instalar deps** (uma vez, para os testes locais):
   ```bash
   cd functions && npm install
   ```

2. **Deploy** — via Appwrite CLI (recomendado) ou console.

   CLI:
   ```bash
   appwrite login
   # rootDirectory = functions/  (para empacotar _shared junto)
   appwrite functions create --functionId ocr-cadastro  --name "OCR Cadastro"  --runtime node-18.0
   appwrite functions create --functionId consulta-cnpj --name "Consulta CNPJ" --runtime node-18.0
   # consulta-cpf-hub já existe; só reativar/atualizar

   # Para cada função: entrypoint e deploy do código
   #   ocr-cadastro   -> entrypoint: ocr-cadastro/index.js
   #   consulta-cnpj  -> entrypoint: consulta-cnpj/index.js
   appwrite functions createDeployment --functionId ocr-cadastro \
     --entrypoint "ocr-cadastro/index.js" --code "./functions" --activate true
   appwrite functions createDeployment --functionId consulta-cnpj \
     --entrypoint "consulta-cnpj/index.js" --code "./functions" --activate true
   ```

   Console: criar função Node 18, **Root directory = `functions`**, Entrypoint = `<pasta>/index.js`, build command `npm install`.

3. **Permissão de execução**: marcar "Any" ou "Users" (o frontend executa autenticado via sessão Appwrite). Habilitar execução síncrona.

4. **Variáveis de ambiente** (Settings da função):
   - `consulta-cpf-hub`: `CPF_API_TOKEN` (obrigatório), `CPF_API_URL` (opcional).
   - `ocr-cadastro`: opcionais `OCR_LANGUAGE=por`, `OCR_MIN_TEXT=40`.
   - `consulta-cnpj`: nenhuma.

5. **Frontend**: os IDs já estão em `frontend-angular/src/environments/environment(.prod).ts`
   (`functions.ocrCadastro`, `functions.consultaCnpj`, `functions.consultaCpf`).
   Se o ID gerado no deploy for diferente, ajustar lá. Reiniciar o `ng serve`.

## Observações

- **OCR**: `tesseract.js` baixa o pacote de idioma `por` do CDN na 1ª execução (cold start mais lento). Funciona em imagens (JPG/PNG); **PDF escaneado** (sem texto nativo) cai para preenchimento manual — não há rasterizador nativo no runtime.
- **Tamanho**: o arquivo trafega como base64 no corpo da execução. Documentos comuns (<3-4 MB) ok; para arquivos grandes, considerar subir ao Appwrite Storage e passar o `fileId`.
- **Desligar o Java** depois de validar as 3 funções:
  ```bash
  cd /home/gustavo-oliveira-santiago/bear-erp && docker compose down
  ```
  Nada no frontend depende mais do gateway/Mongo.

## Testes locais (sem Appwrite)

```bash
cd functions && npm install
node --test                      # se houver testes em _shared/__tests__
# parser de OCR (puro):
node -e "console.log(require('./_shared/ocr/parse-cadastro').parseCadastro('CPF: 390.533.447-05\nNOME: FULANO','PF','RG'))"
```
