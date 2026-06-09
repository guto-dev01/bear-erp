'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Trust store TLS com a cadeia Sectigo — exigência do eSocial em 2026.
 *
 * A partir de 2026 o handshake TLS com os WebServices do eSocial exige a cadeia
 * da AC Sectigo como âncora de confiança no cliente:
 *   - "Sectigo Public Server Authentication Root R4"  → sectigo-root-r4.pem
 *   - "Sectigo Public Server Authentication CA OV R36" → sectigo-ca-ov-r36.pem
 *
 * Cronograma: produção restrita desde 12/01/2026; produção prevista jun/2026.
 *
 * Os .pem reais NÃO são versionados (ver certs/README.md e .gitignore). Eles
 * são providos por ambiente. A origem pode ser configurada por:
 *   - SECTIGO_TRUSTSTORE_DIR  → diretório com os .pem
 *   - NODE_EXTRA_CA_CERTS     → também respeitado nativamente pelo Node no TLS
 * Caso ausente, o diretório padrão é `./certs` ao lado deste arquivo.
 *
 * Esta Etapa 2 apenas PREPARA o trust store; nenhum envio é feito ainda. Em
 * Etapa 3 o resultado de `agentOptions()` alimenta o https.Agent do cliente SOAP.
 */

const ARQUIVOS_ESPERADOS = Object.freeze([
  { arquivo: 'sectigo-root-r4.pem', descricao: 'Sectigo Public Server Authentication Root R4' },
  { arquivo: 'sectigo-ca-ov-r36.pem', descricao: 'Sectigo Public Server Authentication CA OV R36' },
]);

const MARCADOR_PEM = '-----BEGIN CERTIFICATE-----';

function diretorioPadrao(env = process.env) {
  return env.SECTIGO_TRUSTSTORE_DIR || path.join(__dirname, 'certs');
}

function lerPemValido(caminho) {
  try {
    const conteudo = fs.readFileSync(caminho, 'utf8');
    return conteudo.includes(MARCADOR_PEM) ? conteudo : null;
  } catch {
    return null;
  }
}

/**
 * Inspeciona o trust store, retornando o que está instalado e o que falta.
 *
 * @param {{ env?: NodeJS.ProcessEnv, dir?: string }} [opts]
 * @returns {{
 *   dir: string,
 *   instalado: boolean,
 *   ca: string[],            // PEMs presentes (para o https.Agent)
 *   faltando: { arquivo: string, descricao: string }[],
 *   presentes: string[],
 * }}
 */
function inspecionarTruststore({ env = process.env, dir } = {}) {
  const diretorio = dir || diretorioPadrao(env);
  const ca = [];
  const presentes = [];
  const faltando = [];

  for (const item of ARQUIVOS_ESPERADOS) {
    const pem = lerPemValido(path.join(diretorio, item.arquivo));
    if (pem) {
      ca.push(pem);
      presentes.push(item.arquivo);
    } else {
      faltando.push(item);
    }
  }

  // NODE_EXTRA_CA_CERTS pode trazer as cadeias por fora do diretório.
  const extra = lerPemValido(env.NODE_EXTRA_CA_CERTS || '');
  if (extra && presentes.length === 0) ca.push(extra);

  return {
    dir: diretorio,
    instalado: faltando.length === 0,
    ca,
    faltando,
    presentes,
  };
}

/**
 * Opções de CA para um https.Agent. Em modo estrito, falha alto e claro se a
 * cadeia não estiver instalada — melhor do que um handshake silenciosamente
 * quebrado em produção.
 *
 * @param {{ env?: NodeJS.ProcessEnv, dir?: string, estrito?: boolean }} [opts]
 * @returns {{ ca: string[] }}
 */
function agentOptions({ env = process.env, dir, estrito = false } = {}) {
  const t = inspecionarTruststore({ env, dir });
  if (estrito && !t.instalado) {
    const faltam = t.faltando.map((f) => f.descricao).join(', ');
    throw new Error(
      `Trust store Sectigo incompleto — cadeias ausentes: ${faltam}. ` +
        `Instale os .pem em ${t.dir} ou defina SECTIGO_TRUSTSTORE_DIR/NODE_EXTRA_CA_CERTS (ver certs/README.md).`,
    );
  }
  return { ca: t.ca };
}

module.exports = {
  ARQUIVOS_ESPERADOS,
  inspecionarTruststore,
  agentOptions,
  diretorioPadrao,
};
