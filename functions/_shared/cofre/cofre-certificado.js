'use strict';

/**
 * Interface do cofre de certificados A1.
 *
 * Esconde DE ONDE vem o material do certificado (.pfx) e a senha. Hoje o
 * adaptador concreto é o Appwrite Storage; amanhã pode ser KMS/Vault sem que
 * o serviço de certificado nem as functions de transporte mudem.
 *
 * Contrato: `carregar(empresaId)` resolve para `{ pfx: Buffer, senha: string }`.
 * Implementações NUNCA devem logar `pfx` nem `senha`.
 */
class CofreCertificado {
  /**
   * @param {string} _empresaId
   * @returns {Promise<{ pfx: Buffer, senha: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async carregar(_empresaId) {
    throw new Error('CofreCertificado.carregar() não implementado');
  }
}

module.exports = { CofreCertificado };
