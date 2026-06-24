'use strict';

const crypto = require('crypto');

/**
 * Criptografia simétrica de SEGREDOS curtos (a senha do certificado A1).
 *
 * Algoritmo: AES-256-GCM (confidencialidade + autenticidade). A chave mestra
 * vem do ambiente (`CERT_MASTER_KEY`) — NUNCA do banco nem do cliente. Cada
 * cifragem usa um IV aleatório de 96 bits; a tag de autenticação de 128 bits
 * detecta adulteração do ciphertext na decifragem.
 *
 * Formato do token persistido (string única, versionada, fácil de parsear):
 *   "v1.gcm.<ivB64url>.<ctB64url>.<tagB64url>"
 * Guardamos só esse token no documento `certificados` (ciphertext + iv + tag) —
 * a chave mestra fica fora do banco. Substitui a abordagem CERT_SENHA_<id> em
 * env, que não escala para milhares de empresas.
 *
 * Este módulo NÃO loga nada e NÃO persiste nada — é função pura sobre buffers.
 */

const VERSAO = 'v1';
const ALG = 'aes-256-gcm';
const IV_BYTES = 12; // 96 bits — recomendado para GCM
const TAG_BYTES = 16; // 128 bits

/**
 * Lê e valida a chave mestra de 32 bytes do ambiente. Aceita base64 (44 chars)
 * ou hex (64 chars). Lança erro claro se ausente/!= 32 bytes — falhar fechado.
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {Buffer} 32 bytes
 */
function lerChaveMestra(env = process.env) {
  const bruto = env.CERT_MASTER_KEY;
  if (!bruto) {
    throw new Error('CERT_MASTER_KEY ausente no ambiente (chave mestra do cofre de senhas)');
  }
  const chave = decodificarChave(bruto);
  if (chave.length !== 32) {
    throw new Error(`CERT_MASTER_KEY deve ter 32 bytes (256 bits); recebido ${chave.length}`);
  }
  return chave;
}

/** Decodifica a chave: hex(64) → bytes; senão base64/base64url → bytes. */
function decodificarChave(bruto) {
  const s = String(bruto).trim();
  if (/^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, 'hex');
  return Buffer.from(s, 'base64');
}

/**
 * Cifra um segredo (string utf8) com a chave mestra do ambiente.
 * @param {string} texto    segredo em claro (ex.: senha do .pfx)
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {string} token "v1.gcm.iv.ct.tag" (base64url)
 */
function cifrar(texto, env = process.env) {
  if (typeof texto !== 'string' || texto.length === 0) {
    throw new Error('cifrar: texto a proteger é obrigatório');
  }
  const chave = lerChaveMestra(env);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALG, chave, iv);
  const ct = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSAO, 'gcm', b64u(iv), b64u(ct), b64u(tag)].join('.');
}

/**
 * Decifra um token gerado por `cifrar`. Lança se o token for inválido, de versão
 * desconhecida ou se a autenticação (tag) falhar (ciphertext/chave adulterados).
 * @param {string} token
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {string} segredo em claro (utf8)
 */
function decifrar(token, env = process.env) {
  if (typeof token !== 'string' || !token) {
    throw new Error('decifrar: token ausente');
  }
  const partes = token.split('.');
  if (partes.length !== 5 || partes[0] !== VERSAO || partes[1] !== 'gcm') {
    throw new Error('decifrar: token de cofre inválido ou de versão não suportada');
  }
  const iv = deB64u(partes[2]);
  const ct = deB64u(partes[3]);
  const tag = deB64u(partes[4]);
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('decifrar: IV/tag com tamanho inesperado');
  }
  const chave = lerChaveMestra(env);
  const decipher = crypto.createDecipheriv(ALG, chave, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    // Tag inválida (adulteração ou chave errada) — mensagem sem vazar material.
    throw new Error('decifrar: falha de autenticação do segredo (chave incorreta ou dado adulterado)');
  }
}

/** Heurística leve: o valor parece um token deste módulo? */
function ehTokenCofre(valor) {
  return typeof valor === 'string' && /^v1\.gcm\./.test(valor);
}

/** Gera uma chave mestra nova (base64) — utilitário p/ provisionar o ambiente. */
function gerarChaveMestraBase64() {
  return crypto.randomBytes(32).toString('base64');
}

function b64u(buf) {
  return buf.toString('base64url');
}
function deB64u(s) {
  return Buffer.from(s, 'base64url');
}

module.exports = {
  cifrar,
  decifrar,
  ehTokenCofre,
  lerChaveMestra,
  gerarChaveMestraBase64,
};
