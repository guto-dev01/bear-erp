'use strict';

const { CofreCertificado } = require('./cofre-certificado');

/**
 * Cofre em memória — destinado a testes e desenvolvimento local.
 *
 * NÃO usar em produção: mantém o .pfx e a senha em memória do processo.
 */
class MemoriaVault extends CofreCertificado {
  /** @param {Record<string, { pfx: Buffer, senha: string }>} [registros] */
  constructor(registros = {}) {
    super();
    this._registros = new Map(Object.entries(registros));
  }

  /** @param {string} empresaId @param {{ pfx: Buffer, senha: string }} item */
  registrar(empresaId, item) {
    this._registros.set(empresaId, item);
    return this;
  }

  async carregar(empresaId) {
    const item = this._registros.get(empresaId);
    if (!item) {
      throw new Error(`Certificado não encontrado no cofre para empresa ${empresaId}`);
    }
    return item;
  }
}

module.exports = { MemoriaVault };
