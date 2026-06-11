'use strict';

/**
 * Consulta de dados de empresa por CNPJ via BrasilAPI (pública, sem token).
 * Porte da lógica do ConsultaCnpjService.java. I/O injetável para teste.
 *
 * consultarCnpj({ cnpj, url?, httpClient? }) ->
 *   { ok:true, cnpj, razaoSocial, nomeFantasia, email, telefone,
 *     logradouro, numero, bairro, municipio, uf, cep,
 *     situacao, dataAbertura, naturezaJuridica, cnaePrincipal, capitalSocial,
 *     socios:[{nome, qualificacao}] }
 *
 * Lança Error com .codigo ('CNPJ_INVALIDO' | 'NAO_ENCONTRADO' | 'ERRO_EXTERNO').
 */

const URL_PADRAO = 'https://brasilapi.com.br/api/cnpj/v1';

const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

function isValidCnpj(cnpj) {
  cnpj = soDigitos(cnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base, pesos) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += Number(base[i]) * pesos[i];
    const r = 11 - (soma % 11);
    return r >= 10 ? 0 : r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  if (calc(cnpj, p1) !== Number(cnpj[12])) return false;
  return calc(cnpj, p2) === Number(cnpj[13]);
}

function erro(mensagem, codigo) {
  const e = new Error(mensagem);
  e.codigo = codigo;
  return e;
}

/** Telefone "DDD + número" → (DD) NNNNN-NNNN quando possível. */
function formatarTelefone(v) {
  const d = soDigitos(v);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v || undefined;
}

function normalizar(cnpj, r) {
  return {
    cnpj,
    razaoSocial: r.razao_social || undefined,
    nomeFantasia: r.nome_fantasia || undefined,
    email: r.email || undefined,
    telefone: formatarTelefone(r.ddd_telefone_1),
    logradouro: [r.descricao_tipo_de_logradouro, r.logradouro].filter(Boolean).join(' ').trim() || undefined,
    numero: r.numero || undefined,
    bairro: r.bairro || undefined,
    municipio: r.municipio || undefined,
    uf: r.uf || undefined,
    cep: soDigitos(r.cep) || undefined,
    situacao: r.descricao_situacao_cadastral || undefined,
    dataAbertura: r.data_inicio_atividade || undefined,
    naturezaJuridica: r.natureza_juridica || undefined,
    cnaePrincipal: [r.cnae_fiscal, r.cnae_fiscal_descricao].filter(Boolean).join(' - ') || undefined,
    capitalSocial: r.capital_social != null ? String(r.capital_social) : undefined,
    socios: Array.isArray(r.qsa)
      ? r.qsa.map((s) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio })) : [],
  };
}

async function consultarCnpj({ cnpj, url = URL_PADRAO, httpClient } = {}) {
  const limpo = soDigitos(cnpj);
  if (!isValidCnpj(limpo)) throw erro('CNPJ inválido', 'CNPJ_INVALIDO');

  const fetchFn = httpClient || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchFn) throw erro('HTTP client indisponível no runtime', 'ERRO_EXTERNO');

  let resp;
  try {
    // User-Agent explícito: a BrasilAPI fica atrás de Cloudflare, que bloqueia (403)
    // requisições sem UA.
    resp = await fetchFn(`${url}/${limpo}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'bear-erp/1.0 (+https://bearerp.com.br)' },
    });
  } catch (e) {
    throw erro(`Falha ao consultar BrasilAPI: ${e.message}`, 'ERRO_EXTERNO');
  }

  if (resp.status === 404) throw erro('CNPJ não encontrado na Receita', 'NAO_ENCONTRADO');
  if (!resp.ok) throw erro(`BrasilAPI respondeu ${resp.status}`, 'ERRO_EXTERNO');

  const dados = await resp.json();
  return { ok: true, ...normalizar(limpo, dados) };
}

module.exports = { consultarCnpj, isValidCnpj };
