'use strict';

const { consultarCpf } = require('../_shared/hub/consulta-cpf');
const { criarLogger } = require('../_shared/log/logger');

/**
 * Appwrite Function: consulta-cpf-hub.
 *
 * @deprecated A consulta de CPF passou a ser servida pelo backend Java
 *   (integracoes-service → GET /api/v1/integracoes/cpf/{cpf}), acessível pelo
 *   api-gateway. Esta function é mantida apenas como fallback; o frontend não a
 *   usa mais. A lógica de normalização vive em _shared/hub/consulta-cpf.js e foi
 *   portada para ConsultaCpfService.java.
 *
 * Camada fina — lê env (token + endpoint) e delega à lógica testada em
 * `_shared/hub/consulta-cpf.js`. Mantém o token do Hub server-side: o navegador
 * só envia o CPF e recebe os dados normalizados.
 *
 * Entrada (JSON no corpo):
 *   { cpf: "12345678909", dataNascimento?: "1990-05-15" | "15/05/1990" }
 *
 * Saída:
 *   { ok: true,  cpf, normalizado: {...}, bruto: {...} }
 *   { ok: false, erro, codigo }
 *
 * Variáveis de ambiente (Function):
 *   CPF_API_TOKEN  (obrigatória)  — token do Hub do Desenvolvedor
 *   CPF_API_URL    (opcional)     — endpoint base; default = Hub v2
 */
module.exports = async ({ req, res, error }) => {
  const logger = criarLogger('fn:consulta-cpf-hub');
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { cpf, dataNascimento } = corpo;
    if (!cpf) {
      return res.json({ ok: false, erro: 'cpf é obrigatório', codigo: 'CPF_AUSENTE' }, 400);
    }

    const token = process.env.CPF_API_TOKEN;
    const url = process.env.CPF_API_URL || undefined;
    if (!token) {
      logger.error('CPF_API_TOKEN não configurado na Function');
      return res.json({ ok: false, erro: 'Integração de CPF não configurada', codigo: 'TOKEN_AUSENTE' }, 500);
    }

    const resultado = await consultarCpf({ cpf, dataNascimento, token, url });
    logger.info('Consulta de CPF concluída', { cpf: resultado.cpf, nome: resultado.normalizado?.nome });
    return res.json({ ok: true, ...resultado });
  } catch (e) {
    const codigo = e.codigo || 'ERRO';
    // 400 para entrada inválida; 404 para não encontrado; 502 para falha externa.
    const httpStatus =
      codigo === 'CPF_INVALIDO' || codigo === 'CPF_AUSENTE' ? 400
      : codigo === 'NAO_ENCONTRADO' ? 404
      : codigo === 'TOKEN_AUSENTE' ? 500
      : 502;
    error?.(e.message);
    logger.error('Falha na consulta de CPF', { erro: e.message, codigo });
    return res.json({ ok: false, erro: e.message, codigo }, httpStatus);
  }
};
