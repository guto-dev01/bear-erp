'use strict';

const { lerPkcs12 } = require('./pkcs12');

/**
 * Serviço de certificado digital — único e reutilizável por todas as
 * integrações (Parte 4). Orquestra: cofre → leitura PKCS#12 → metadados +
 * avaliação de vencimento. Mantém o material sensível (chave/senha) fora de
 * qualquer log ou retorno acidental.
 */

/**
 * Avalia o vencimento de um certificado.
 * @param {Date} validoAte
 * @param {number} [diasAlerta=30]
 * @param {Date} [agora=new Date()]
 */
function avaliarVencimento(validoAte, diasAlerta = 30, agora = new Date()) {
  const ms = validoAte.getTime() - agora.getTime();
  const diasParaVencer = Math.floor(ms / 86_400_000);
  return {
    diasParaVencer,
    vencido: diasParaVencer < 0,
    alerta: diasParaVencer >= 0 && diasParaVencer <= diasAlerta,
    validoAte: validoAte.toISOString(),
  };
}

/**
 * Metadados públicos de um certificado (seguros para persistir/exibir).
 * NÃO inclui chave privada nem PEM da folha — esses ficam só no objeto interno.
 */
function montarMetadados(p12, { diasAlerta = 30, agora = new Date() } = {}) {
  const venc = avaliarVencimento(p12.validoAte, diasAlerta, agora);
  return {
    titular: p12.titular,
    cnpjCpf: p12.cnpjCpf,
    serialNumber: p12.serialNumber,
    emissor: p12.emissor,
    validoDe: p12.validoDe.toISOString(),
    validoAte: p12.validoAte.toISOString(),
    tamanhoCadeia: p12.chainPem.length,
    ...venc,
  };
}

/**
 * Carrega e interpreta o certificado de uma empresa a partir do cofre.
 *
 * @param {{ carregar(empresaId: string): Promise<{pfx: Buffer, senha: string}> }} cofre
 * @param {string} empresaId
 * @param {{ diasAlerta?: number, agora?: Date }} [opts]
 * @returns {Promise<{
 *   metadados: object,
 *   material: { leafPem: string, privateKeyPem: string, chainPem: string[] },
 * }>}
 *  `metadados` é seguro para log/persistência; `material` contém a chave
 *  privada e só deve ser passado adiante para a assinatura (Etapa 3).
 */
async function carregarCertificado(cofre, empresaId, opts = {}) {
  const { pfx, senha } = await cofre.carregar(empresaId);
  const p12 = lerPkcs12(pfx, senha);
  return {
    metadados: montarMetadados(p12, opts),
    material: {
      leafPem: p12.leafPem,
      privateKeyPem: p12.privateKeyPem,
      chainPem: p12.chainPem,
    },
  };
}

module.exports = {
  carregarCertificado,
  avaliarVencimento,
  montarMetadados,
};
