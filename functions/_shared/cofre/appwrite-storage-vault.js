'use strict';

const { CofreCertificado } = require('./cofre-certificado');
const { decifrar, ehTokenCofre } = require('../cripto/segredo');

/**
 * Adaptador de cofre sobre o Appwrite Storage.
 *
 * Decisão de arquitetura: o arquivo .pfx do A1 fica num bucket privado do
 * Appwrite Storage (criptografado em repouso, sem role pública — acessível
 * apenas pela API key do servidor/Function). A SENHA do certificado NUNCA fica
 * em texto puro no banco.
 *
 * Resolução:
 *  - O `storageFileId` (id do arquivo no bucket) é lido do documento da
 *    coleção `certificados`, a partir do `certificadoDigitalId` da empresa.
 *  - A senha é resolvida nesta ordem:
 *      1. `senhaProvider(empresaId, cert)` explícito (injeção de teste);
 *      2. campo `senhaCofre` do documento `certificados`, DECIFRADO com a chave
 *         mestra do ambiente (`CERT_MASTER_KEY`) via AES-256-GCM — caminho
 *         padrão de produção, que escala para milhares de empresas;
 *      3. fallback de env `CERT_SENHA_<EMPRESAID>` / `CERT_SENHA` — mantido
 *         apenas para o ambiente de teste/legado.
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
    // Guarda só o provider explícito (injeção de teste); o caminho padrão é
    // decifrar `senhaCofre` com a chave mestra, com fallback de env.
    this._senhaProvider = typeof senhaProvider === 'function' ? senhaProvider : null;
  }

  /** Senha do certificado a partir do ambiente (fallback de teste/legado). */
  _senhaDoEnv(empresaId) {
    const chaveEspecifica = `CERT_SENHA_${String(empresaId).toUpperCase()}`;
    return this._env[chaveEspecifica] ?? this._env.CERT_SENHA ?? '';
  }

  /** Resolve o documento do certificado (com storageFileId) a partir da empresa. */
  async _resolverCertificado(empresaId) {
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

  /** Resolve a senha do .pfx: provider explícito → senhaCofre cifrada → env. */
  async _resolverSenha(empresaId, cert) {
    if (this._senhaProvider) return this._senhaProvider(empresaId, cert);
    if (cert && ehTokenCofre(cert.senhaCofre)) {
      // Decifra com a chave mestra do ambiente (nunca do banco/cliente).
      return decifrar(cert.senhaCofre, this._env);
    }
    return this._senhaDoEnv(empresaId);
  }

  async carregar(empresaId) {
    const cert = await this._resolverCertificado(empresaId);
    const baixado = await this._storage.getFileDownload(this._bucketId, cert.storageFileId);
    const pfx = paraBuffer(baixado);
    const senha = await this._resolverSenha(empresaId, cert);
    if (!senha) {
      throw new Error(
        `Senha do certificado da empresa ${empresaId} ausente (sem senhaCofre cifrada nem CERT_SENHA_<empresaId>/CERT_SENHA no ambiente)`,
      );
    }
    return { pfx, senha };
  }
}

/** node-appwrite pode retornar ArrayBuffer/Uint8Array/Buffer — normaliza. */
function paraBuffer(dado) {
  if (Buffer.isBuffer(dado)) return dado;
  if (dado instanceof ArrayBuffer) return Buffer.from(dado);
  if (ArrayBuffer.isView(dado)) return Buffer.from(dado.buffer, dado.byteOffset, dado.byteLength);
  return Buffer.from(dado);
}

module.exports = { AppwriteStorageVault, paraBuffer };
