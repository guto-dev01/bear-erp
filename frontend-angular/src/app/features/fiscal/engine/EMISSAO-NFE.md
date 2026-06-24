# Emissão de NF-e — pipeline e o seam de assinatura/transmissão

A emissão real de uma NF-e tem 4 etapas. As duas primeiras são **puras/offline** e já
estão prontas e testadas neste módulo; as duas últimas são **ambiente-bound** (exigem o
certificado A1 e os webservices da SEFAZ) e rodam numa Appwrite Function.

```
[1] Montar XML        →  [2] Validar/numerar     →  [3] Assinar (A1)        →  [4] Transmitir (SEFAZ)
    nfe-xml.ts             chave + DV (mód. 11)        XML-DSig + cert A1          autorização + protocolo
    (FEITO, offline)       (FEITO, offline)            (Appwrite Function)         (Appwrite Function)
```

## [1]+[2] — o que está pronto aqui (Fase 6)

- `engine/nfe-xml.ts`
  - `gerarChaveAcesso(...)` / `calcularDV(...)` — chave de 44 dígitos + DV módulo 11.
  - `gerarXmlNFe(nota)` — XML do grupo `<NFe><infNFe …>` no layout **4.00** (ide/emit/
    dest/det/total/transp/pag), **não assinado**.
- `fiscal.service.ts → gerarXmlNotaFiscal(notaId)` monta a `NotaNFe` (emitente da
  collection `empresas`, destinatário + itens da nota) e devolve `{ chave, xml }`.
- UI: botão **"Baixar XML"** na lista de NF-e.
- Teste: `scripts/test-nfe-xml.ts` faz round-trip (gera → reimporta pelo parser da Fase 2).

## [3]+[4] — o seam que falta (precisa de ambiente)

Por que não dá pra fazer aqui: a assinatura precisa da **chave privada do A1** e a
transmissão precisa de **mTLS contra os webservices da SEFAZ** (homologação/produção).
Nada disso é validável neste ambiente — segue a arquitetura de integrações gov (cofre A1
no Storage, lógica nova no Appwrite, não no backend Java legado).

### ✅ Implementado: Appwrite Function `nfe-transmissao` (esqueleto testado)

`functions/nfe-transmissao/index.js` (camada fina) → `functions/_shared/nfe/`:
- `soap.js` — envelope SOAP 1.1 (`nfeDadosMsg`/`enviNFe`/`consStatServ`). PURO.
- `respostas.js` — parse do retorno (cStat/nProt/chNFe) + `classificarStatus`. PURO.
- `assinatura.js` — XML-DSig da NF-e (RSA-SHA1, Reference `#NFe<chave>`, `<Signature>`
  irmã do `infNFe`). Reusa `xml-crypto`. **Testado offline** com A1 de teste.
- `webservices.js` — porte CommonJS do resolvedor (mantenha em sincronia com o TS).
- `transmissao.js` — orquestrador: cofre (A1) → assinar → envelope → `chamarSoap`
  (mTLS, reusa o cliente do eSocial) → parse. `httpsModule` injetável.

Testes: `functions/_shared/__tests__/nfe-{soap,assinatura,transmissao}.test.js`
(19 asserções, `node --test`) — o pipeline inteiro roda **sem rede e sem A1 real**
(cofre fake + A1 de teste + https fake). Só falta, no seu ambiente: subir o A1 real
no cofre (Storage) e transmitir contra a SEFAZ de verdade (homologação primeiro).

### Contrato (já implementado) da Appwrite Function `nfe-transmissao`

```
entrada : { xml: string, chave: string, ambiente: '1'|'2', empresaId, certificadoId }
passos  : 1. baixa o A1 (.pfx) do Storage (cofre) + senha do secret
          2. assina infNFe (XML-DSig: SHA-1/RSA, ref. "#NFe<chave>", enveloped + c14n)
          3. monta nfeProc / lote e chama NFeAutorizacao4 (mTLS) da UF
          4. trata o retorno (cStat 100 autorizado, 110/301/302… denegado/erro)
saída   : { status, protocolo, dataAutorizacao, xmlAutorizado, motivo? }
```

O front então persiste em `notas_fiscais`: `status`, `protocolo`, `dataAutorizacao`,
`chaveAcesso` e o `xmlStorageId` (campos já existentes no schema). Hoje `autorizarNfe`/
`cancelarNfe` apenas marcam o status e avisam que a integração externa não está disponível.

### Para onde transmitir — `engine/sefaz-webservices.ts`

A etapa [4] já tem o roteamento pronto e testado: `urlWebService(uf, servico, ambiente)`
resolve UF → autorizador (SEFAZ própria / SVRS / SVAN) → URL do endpoint. A Function
chama, por exemplo, `urlWebService('SP', 'NFeAutorizacao4', 'producao')`.

⚠️ As URLs foram transcritas de pesquisa no Portal Nacional (ref. 23/06/2026) e **mudam
por Nota Técnica** — VALIDE no portal antes de produção; o módulo é a fonte única a
corrigir. Lacunas (SEFAZ própria não mapeada): AM, GO, MS, MT, PE.

### Documentação oficial (referência da pesquisa)
- Portal Web Services: https://www.nfe.fazenda.gov.br/portal/ → *Serviços > Web Services*
- MOC (Manual de Orientação ao Contribuinte) v7.0 + Anexo I (Leiaute/Regras de validação)
  e Anexo III (Contingência): https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=ndIjl+iEFdE=
- Notas Técnicas: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=
  (base do leiaute 4.00: NT 2018.005; em vigência jun/2026: NT 2025.002 Reforma Tributária,
  NT 2026.004 CNPJ alfanumérico).

## Fora de escopo da Fase 6 (próximas evoluções)
- Eventos (cancelamento, carta de correção, inutilização) e contingência (tpEmis).
- DANFE (PDF) a partir do XML autorizado.
- NFC-e (mod. 65: QR Code + CSC) e CT-e/MDF-e reutilizando o mesmo pipeline.
