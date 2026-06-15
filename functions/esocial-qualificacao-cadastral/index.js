'use strict';

const { qualificarLocal, consultarOficial } = require('../_shared/esocial/qualificacao/qualificacao-cadastral');
const { criarLogger } = require('../_shared/log/logger');

/**
 * Appwrite Function: esocial-qualificacao-cadastral.
 *
 * Valida a consistência CPF × NIS/PIS × NOME de um trabalhador antes de
 * transmitir eventos ao eSocial (admissão etc.). Camada fina — delega à lógica
 * testada em `_shared/esocial/qualificacao/qualificacao-cadastral.js`.
 *
 * Sempre executa a PRÉ-VALIDAÇÃO local (dígitos verificadores + nome). Se o
 * webservice OFICIAL estiver configurado (`ESOCIAL_QUALIF_WS_URL`), também o
 * consulta e devolve o resultado oficial; caso contrário marca a parte oficial
 * como pendente — sem fingir validação que não houve.
 *
 * Entrada (JSON no corpo):
 *   { cpf, nome, nis, dtNascto? }
 *
 * Saída:
 *   { ok: true, local: {...}, oficial: { disponivel: bool, ... | pendente } }
 *
 * Variáveis de ambiente (Function):
 *   ESOCIAL_QUALIF_WS_URL  (opcional)  — endpoint do WS oficial; sem ele a
 *                                        consulta oficial fica pendente.
 */
module.exports = async ({ req, res, error }) => {
  const logger = criarLogger('fn:esocial-qualificacao-cadastral');
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { cpf, nome, nis, dtNascto } = corpo;
    if (!cpf || !nis || !nome) {
      return res.json({ ok: false, erro: 'cpf, nome e nis são obrigatórios', codigo: 'DADOS_AUSENTES' }, 400);
    }

    const local = qualificarLocal({ cpf, nome, nis });

    // Consulta oficial é best-effort: pendência de config/implementação não
    // derruba a pré-validação local (que já é útil ao usuário).
    let oficial;
    try {
      const resultado = await consultarOficial({ cpf, nome, nis, dtNascto, env: process.env });
      oficial = { disponivel: true, ...resultado };
    } catch (e) {
      oficial = { disponivel: false, pendente: true, codigo: e.codigo || 'ERRO', motivo: e.message };
    }

    logger.info('Qualificação cadastral processada', {
      cpf: local.cpf,
      qualificadoLocal: local.qualificado,
      oficialDisponivel: oficial.disponivel,
    });
    return res.json({ ok: true, local, oficial });
  } catch (e) {
    error?.(e.message);
    logger.error('Falha na qualificação cadastral', { erro: e.message });
    return res.json({ ok: false, erro: e.message, codigo: e.codigo || 'ERRO' }, 500);
  }
};
