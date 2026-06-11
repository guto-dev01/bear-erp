'use strict';

const { consultarCnpj } = require('../_shared/cnpj/consulta-cnpj');
const { consultarCpf } = require('../_shared/hub/consulta-cpf');
const { criarLogger } = require('../_shared/log/logger');

/**
 * Appwrite Function: consulta-cnpj — consultas à Receita (CPF e CNPJ).
 *
 * Atende AMBAS as consultas numa única função (o plano Appwrite limita o nº de
 * funções). Roteia pelo payload: `cnpj` → BrasilAPI (pública); `cpf` → Hub do
 * Desenvolvedor (token server-side). Substitui os endpoints Java de CPF e CNPJ.
 *
 * Entrada (JSON):
 *   { cnpj: "11222333000181" }                      → dados da empresa
 *   { cpf: "12345678909", dataNascimento?: "..." }  → dados da pessoa física
 *
 * Saída CNPJ:  { ok:true, cnpj, razaoSocial, ... }
 * Saída CPF:   { ok:true, cpf, normalizado:{nome,dataNascimento,...}, bruto }
 * Erro:        { ok:false, erro, codigo }
 *
 * Env: CPF_API_TOKEN (obrigatória p/ CPF), CPF_API_URL (opcional).
 */
module.exports = async ({ req, res, error }) => {
  const logger = criarLogger('fn:consultas-receita');
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { cpf, cnpj, dataNascimento } = corpo;

    if (cpf) {
      const token = process.env.CPF_API_TOKEN;
      if (!token) {
        logger.error('CPF_API_TOKEN não configurado na Function');
        return res.json({ ok: false, erro: 'Integração de CPF não configurada', codigo: 'TOKEN_AUSENTE' }, 500);
      }
      const resultado = await consultarCpf({ cpf, dataNascimento, token, url: process.env.CPF_API_URL || undefined });
      logger.info('Consulta de CPF concluída', { cpf: resultado.cpf, nome: resultado.normalizado?.nome });
      return res.json({ ok: true, ...resultado });
    }

    if (cnpj) {
      const resultado = await consultarCnpj({ cnpj });
      logger.info('Consulta de CNPJ concluída', { cnpj: resultado.cnpj, razaoSocial: resultado.razaoSocial });
      return res.json(resultado);
    }

    return res.json({ ok: false, erro: 'Informe "cpf" ou "cnpj" no corpo.', codigo: 'PARAM_AUSENTE' }, 400);
  } catch (e) {
    const codigo = e.codigo || 'ERRO';
    const httpStatus =
      codigo === 'CPF_INVALIDO' || codigo === 'CNPJ_INVALIDO' || codigo.endsWith('_AUSENTE') ? 400
      : codigo === 'NAO_ENCONTRADO' ? 404
      : codigo === 'TOKEN_AUSENTE' ? 500
      : 502;
    error?.(e.message);
    logger.error('Falha na consulta', { erro: e.message, codigo });
    return res.json({ ok: false, erro: e.message, codigo }, httpStatus);
  }
};
