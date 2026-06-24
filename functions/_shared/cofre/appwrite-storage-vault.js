'use strict';

const crypto = require('crypto');
const { CofreCertificado } = require('./cofre-certificado');

/**
 * Adaptador de cofre sobre o Appwrite Storage.
 *
 * Decisão de arquitetura (Etapa 2): o arquivo .pfx do A1 fica num bucket
 * privado do Appwrite Storage (criptografado em repouso, sem role pública —
 * acessível apenas pela API key do servidor/Function). A SENHA do certificado
 * NUNCA fica no banco: vem de variável de ambiente/secret da Function.
 *
 * Resolução:
 *  - O `storageFileId` (id do arquivo no bucket) é lido do documento da
 *    coleção `certificados`, a partir do `certificadoDigitalId` da empresa.
 *  - A senha vem de `senhaProvider(empresaId)` — por padrão, lê do env
 *    `CERT_SENHA_<EMPRESAID>` e, como fallback, `CERT_SENHA`.
 *
 * Tudo que toca rede/SDK é injetável, para manter o serviço testável sem
 * Appwrite real.
 */
class AppwriteStorageVault extends CofreCertificado {
  /**
   * @param {object} deps
   * @param {object} deps.storage     Instância de node-appwrite `Storage`.
   * @param {object} deps.databases   Instância de node-appwrite `Databases`.
   * @param {string} deps.bucketId    Id do bucket privado dos .pfx.
   * @param {string} deps.dbId        Id do database.
   * @param {string} [deps.empresasCollection='empresas']
   * @param {string} [deps.certificadosCollection='certificados']
   * @param {(empresaId: string) => (string|Promise<string>)} [deps.senhaProvider]
   * @param {NodeJS.ProcessEnv} [deps.env]
   */
  constructor({
    storage,
    databases,
    bucketId,
    dbId,
    empresasCollection = 'empresas',
    certificadosCollection = 'certificados',
    senhaProvider,
    env = process.env,
  }) {
    super();
    if (!storage) throw new Error('AppwriteStorageVault: storage é obrigatório');
    if (!databases) throw new Error('AppwriteStorageVault: databases é obrigatório');
    if (!bucketId) throw new Error('AppwriteStorageVault: bucketId é obrigatório');
    if (!dbId) throw new Error('AppwriteStorageVault: dbId é obrigatório');
    this._storage = storage;
    this._databases = databases;
    this._bucketId = bucketId;
    this._dbId = dbId;
    this._empresasCollection = empresasCollection;
    this._certificadosCollection = certificadosCollection;
    this._env = env;
    this._senhaProvider = senhaProvider || ((empresaId) => this._senhaDoEnv(empresaId));
  }

  /** Senha do certificado a partir do ambiente, nunca do banco. */
  _senhaDoEnv(empresaId) {
    const chaveEspecifica = `CERT_SENHA_${String(empresaId).toUpperCase()}`;
    return this._env[chaveEspecifica] ?? this._env.CERT_SENHA ?? '';
  }

  /** Resolve o documento do certificado a partir da empresa. */
  async _resolverCert(empresaId) {
    const empresa = await this._databases.getDocument(
      this._dbId,
      this._empresasCollection,
      empresaId,
    );
    const certId = empresa.certificadoDigitalId;
    if (!certId) {
      throw new Error(`Empresa ${empresaId} não possui certificadoDigitalId`);
    }
    const cert = await this._databases.getDocument(
      this._dbId,
      this._certificadosCollection,
      certId,
    );
    if (!cert.storageFileId) {
      throw new Error(`Certificado ${certId} sem storageFileId (arquivo .pfx não enviado ao cofre)`);
    }
    return cert;
  }

  /**
   * Resolve a senha do certificado, na ordem:
   *  1. campo `senhaCert` do documento (cifrado em AES-GCM com CERT_VAULT_KEY);
   *  2. `senhaProvider` (por padrão, CERT_SENHA_<empresaId> / CERT_SENHA do env).
   */
  async _resolverSenha(cert, empresaId) {
    if (cert.senhaCert) {
      const chave = this._env.CERT_VAULT_KEY;
      if (!chave) {
        throw new Error(
          `Certificado da empresa ${empresaId} tem senha no cofre, mas CERT_VAULT_KEY não está no ambiente da Function`,
        );
      }
      return decifrarSenha(cert.senhaCert, chave);
    }
    return this._senhaProvider(empresaId);
  }

  async carregar(empresaId) {
    const cert = await this._resolverCert(empresaId);
    const baixado = await this._storage.getFileDownload(this._bucketId, cert.storageFileId);
    const pfx = paraBuffer(baixado);
    const senha = await this._resolverSenha(cert, empresaId);
    if (!senha) {
      throw new Error(
        `Senha do certificado da empresa ${empresaId} ausente (defina CERT_SENHA_<empresaId> ou CERT_SENHA no ambiente)`,
      );
    }
    return { pfx, senha };
  }
}

/**
 * Decifra a senha do .pfx gravada pelo frontend.
 * Formato: base64(iv[12]) ":" base64(ciphertext+authTag[16]). A chave é o
 * CERT_VAULT_KEY (base64, 32 bytes). Mesmo algoritmo do navegador (Web Crypto).
 */
function decifrarSenha(blob, chaveBase64) {
  const sep = String(blob).indexOf(':');
  if (sep === -1) throw new Error('senhaCert em formato inválido (esperado iv:ciphertext)');
  const iv = Buffer.from(blob.slice(0, sep), 'base64');
  const dados = Buffer.from(blob.slice(sep + 1), 'base64');
  const chave = Buffer.from(chaveBase64, 'base64');
  const tag = dados.subarray(dados.length - 16);
  const cipher = dados.subarray(0, dados.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', chave, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString('utf8');
}

/** node-appwrite pode retornar ArrayBuffer/Uint8Array/Buffer — normaliza. */
function paraBuffer(dado) {
  if (Buffer.isBuffer(dado)) return dado;
  if (dado instanceof ArrayBuffer) return Buffer.from(dado);
  if (ArrayBuffer.isView(dado)) return Buffer.from(dado.buffer, dado.byteOffset, dado.byteLength);
  return Buffer.from(dado);
}

module.exports = { AppwriteStorageVault, paraBuffer, decifrarSenha };
