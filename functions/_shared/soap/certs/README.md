# Trust store TLS — cadeia Sectigo (eSocial 2026)

A partir de 2026 o handshake **TLS** com os WebServices do eSocial exige a cadeia
da AC **Sectigo** instalada como âncora de confiança no cliente. Sem ela, as
chamadas HTTPS aos serviços de envio/consulta **falham no handshake**.

> Cronograma oficial: produção restrita desde **12/01/2026**; produção prevista
> para **junho/2026**.

## Arquivos esperados (NÃO versionados)

Coloque os dois certificados de cadeia, em PEM, neste diretório:

| Arquivo | Certificado |
|---|---|
| `sectigo-root-r4.pem` | Sectigo Public Server Authentication **Root R4** |
| `sectigo-ca-ov-r36.pem` | Sectigo Public Server Authentication **CA OV R36** |

Estes `.pem` estão no `.gitignore` de propósito — devem ser providos por
ambiente/deploy, nunca commitados.

## Como obter

Baixe os certificados em <https://www.sectigo.com/> (seção de root/intermediate
certificates) ou pela Documentação Técnica do eSocial em
<https://www.gov.br/esocial/>. Converta para PEM se vierem em `.crt`/`.der`:

```bash
openssl x509 -inform DER -in sectigo-root-r4.der  -out sectigo-root-r4.pem
openssl x509 -inform DER -in sectigo-ca-ov-r36.der -out sectigo-ca-ov-r36.pem
```

Cada arquivo deve conter um bloco `-----BEGIN CERTIFICATE-----`.

## Onde isto é configurado

- Diretório alternativo: variável de ambiente `SECTIGO_TRUSTSTORE_DIR`.
- Alternativamente, `NODE_EXTRA_CA_CERTS` (respeitada nativamente pelo Node).
- O carregador é `functions/_shared/soap/truststore-sectigo.js`. Ele reporta o
  que falta e, em modo estrito (Etapa 3), aborta o envio com mensagem clara se a
  cadeia não estiver instalada.

## Em runtimes Java (backend legado)

Se algum componente Java for usado, importe as cadeias no truststore e
**reinicie** o servidor após instalar:

```bash
keytool -importcert -alias sectigo-root-r4  -file sectigo-root-r4.pem  -keystore $JAVA_HOME/lib/security/cacerts
keytool -importcert -alias sectigo-ca-ov-r36 -file sectigo-ca-ov-r36.pem -keystore $JAVA_HOME/lib/security/cacerts
```
