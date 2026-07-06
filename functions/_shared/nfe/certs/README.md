# CAs dos hosts da NF-e — Ambiente Nacional (entrada)

`an-ca.pem` — cadeia de confiança usada no mTLS das operações de **entrada**
(Distribuição DF-e e Manifestação), em `../importacao.js`.

## Por quê
Os hosts do Ambiente Nacional usam CAs diferentes dos hosts de emissão da UF
(que estão em `nfe-transmissao/certs/sefaz-ca.pem` = intermediária AC SOLUTI
**+ raiz ICP-Brasil v10**; o Node não aceita âncora parcial — só a intermediária
no bundle dá `unable to get issuer certificate`):

| Host | Serviço | CA |
|---|---|---|
| www1 / hom1.nfe.fazenda.gov.br | Distribuição DF-e | **AC SERPRO AR46 OV TLS CA 2025** (ICP-Brasil, privada) → precisa deste `an-ca.pem` |
| www / hom.nfe.fazenda.gov.br | RecepcaoEvento (manifestação) | **Let's Encrypt** (pública) → coberta por `tls.rootCertificates` (flag `incluirRaizesPadrao`) |

Como passar `ca` a um `https.Agent` **substitui** o bundle padrão do Node, a
`importacao.js` soma explicitamente: `an-ca.pem` (SERPRO) + `tls.rootCertificates`
(Let's Encrypt e demais raízes públicas).

## Conteúdo
Intermediária **AC SERPRO AR46 OV TLS CA 2025** (válida até 2030-10-15), usada
como âncora — a folha dos hosts é assinada diretamente por ela.

## Como atualizar (quando a SEFAZ rotacionar a intermediária)
```
echo | openssl s_client -connect www1.nfe.fazenda.gov.br:443 \
  -servername www1.nfe.fazenda.gov.br -showcerts 2>/dev/null \
  | awk '/BEGIN CERT/{c++} c==2,/END CERT/' > an-ca.pem   # 2º cert = a intermediária
```
Ideal: ancorar na **raiz ICP-Brasil** em vez da intermediária. Este arquivo é
uma CA pública (não é segredo) e pode ser versionado.
