'use strict';

const https = require('https');
const { URL } = require('url');
const { agentOptions } = require('../../soap/truststore-sectigo');

/**
 * Transporte SOAP 1.1 sobre HTTPS com TLS mútuo (mTLS).
 *
 * O eSocial autentica o cliente pelo certificado A1 (e-CNPJ) no próprio
 * handshake TLS — por isso `cert`/`key` vão no agente. A cadeia Sectigo
 * (truststore) entra como `ca` (exigência 2026). Em modo estrito, falha alto e
 * claro se a cadeia não estiver instalada.
 *
 * `httpsModule` é injetável para testar sem rede.
 */

/**
 * @param {object} p
 * @param {string} p.url
 * @param {string} p.xmlEnvelope        envelope SOAP completo
 * @param {{ leafPem: string, privateKeyPem: string, chainPem?: string[] }} p.material
 * @param {string} [p.soapAction='']
 * @param {number} [p.timeoutMs=60000]
 * @param {boolean} [p.truststoreEstrito=true]
 * @param {boolean} [p.anexarCadeiaCliente=true]  false p/ SEFAZ (não usar a cadeia do cert como trust anchor do servidor)
 * @param {object} [p.env=process.env]
 * @param {object} [p.httpsModule=https]  injeção p/ teste
 * @returns {Promise<{ status: number, body: string, headers: object }>}
 */
function chamarSoap({
  url,
  xmlEnvelope,
  material,
  soapAction = '',
  timeoutMs = 60000,
  truststoreEstrito = true,
  anexarCadeiaCliente = true,
  env = process.env,
  httpsModule = https,
}) {
  if (!url) throw new Error('url é obrigatória');
  if (!material?.leafPem || !material?.privateKeyPem) {
    throw new Error('material (leafPem/privateKeyPem) é obrigatório para mTLS');
  }

  // Cadeia Sectigo — aborta aqui se faltar e estrito (melhor que handshake mudo).
  const { ca } = agentOptions({ env, estrito: truststoreEstrito });

  const u = new URL(url);
  const corpo = Buffer.from(xmlEnvelope, 'utf8');

  // Trust anchors do servidor. No eSocial, a cadeia do próprio cert (ICP-Brasil)
  // soma à Sectigo (anexarCadeiaCliente=true). Na SEFAZ isso quebraria: anexar a
  // cadeia do CLIENTE como `ca` substitui o bundle do sistema/NODE_EXTRA_CA_CERTS
  // e o cert do SERVIDOR da SEFAZ deixa de validar — por isso a NF-e passa false
  // e confia no truststore configurado (Sectigo/NODE_EXTRA_CA_CERTS) ou no bundle
  // padrão do Node quando `ca` fica vazio.
  const caFinal = anexarCadeiaCliente ? [...ca, ...(material.chainPem || [])] : [...ca];
  const agent = new httpsModule.Agent({
    cert: material.leafPem,
    key: material.privateKeyPem,
    ca: caFinal.length ? caFinal : undefined,
    keepAlive: false,
  });

  const options = {
    method: 'POST',
    hostname: u.hostname,
    port: u.port || 443,
    path: u.pathname + u.search,
    agent,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Content-Length': corpo.length,
      SOAPAction: `"${soapAction}"`,
    },
    timeout: timeoutMs,
  };

  return new Promise((resolve, reject) => {
    const req = httpsModule.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString('utf8'),
          headers: res.headers,
        }),
      );
    });
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout SOAP após ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.write(corpo);
    req.end();
  });
}

module.exports = { chamarSoap };
