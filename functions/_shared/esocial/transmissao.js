'use strict';

const { getConfig } = require('../config/environment');
const { carregarCertificado } = require('../certificado/certificado-service');
const { montarS1000 } = require('./eventos/s1000');
const { assinarEvento } = require('./assinatura/xmldsig');
const { montarLote } = require('./lote/monta-lote');
const { enviarLote, consultarLote } = require('./operacoes');
const { ESTADO, podeEnviar, estadoPorCodigoLote } = require('./estado/maquina-estado');
const { criarLogger } = require('../log/logger');

/**
 * Orquestrador de transmissão eSocial: cofre → montar → assinar → lote → enviar
 * → persistir estado. E a consulta por protocolo que fecha o ciclo assíncrono.
 *
 * Tudo é injetável (repo, cofre, httpsModule, env) — testável sem rede/Appwrite.
 * NÃO transmite nada em import; só quando chamado com material real e ambiente.
 */

const log = criarLogger('esocial:transmissao');

/** Registro de montadores por tipo de evento (cresce nas próximas etapas). */
const MONTADORES = Object.freeze({
  'S-1000': montarS1000,
});

/**
 * Monta o XML de um evento conforme seu tipo.
 * @param {{ tipoEvento: string, dados: object }} evento
 * @param {object} opts  repassado ao montador (versaoLeiaute, data, sequencial)
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarEvento(evento, opts) {
  const montador = MONTADORES[evento.tipoEvento];
  if (!montador) {
    throw new Error(`Sem montador para tipoEvento ${evento.tipoEvento} (implementar)`);
  }
  return montador(evento.dados, opts);
}

/**
 * Transmite um lote de eventos.
 *
 * @param {object} p
 * @param {object} p.repo                RepositorioEventos
 * @param {object} p.cofre               CofreCertificado
 * @param {string} p.empresaId
 * @param {1|2} p.grupo
 * @param {{ tpInsc: number, nrInsc: string }} p.ideEmpregador
 * @param {{ tpInsc: number, nrInsc: string }} p.ideTransmissor
 * @param {{ eventoId: string, tipoEvento: string, dados: object, statusAtual?: string }[]} p.eventos
 * @param {object} [p.env=process.env]
 * @param {object} [p.httpsModule]
 * @returns {Promise<{ protocolo: string, cdResposta: number, ambiente: number, eventos: object[] }>}
 */
async function transmitirLote({
  repo,
  cofre,
  empresaId,
  grupo,
  ideEmpregador,
  ideTransmissor,
  eventos,
  env = process.env,
  httpsModule,
}) {
  const cfg = getConfig(env);

  // 1) Carrega o certificado da empresa (cofre → material p/ assinar + mTLS).
  const { metadados, material } = await carregarCertificado(cofre, empresaId, {
    diasAlerta: cfg.diasAlertaCertificado,
  });
  if (metadados.vencido) {
    throw new Error(`Certificado da empresa ${empresaId} vencido em ${metadados.validoAte}`);
  }
  if (metadados.alerta) {
    log.warn('Certificado próximo do vencimento', { empresaId, diasParaVencer: metadados.diasParaVencer });
  }

  // 2) Idempotência: não retransmite o que já está em voo/aceito.
  for (const ev of eventos) {
    if (ev.statusAtual && !podeEnviar(ev.statusAtual)) {
      throw new Error(`Evento ${ev.eventoId} em estado ${ev.statusAtual} não pode ser reenviado`);
    }
  }

  // 3) Monta e assina cada evento.
  const preparados = eventos.map((ev, i) => {
    const { id, xml, alias } = montarEvento(ev, {
      versaoLeiaute: cfg.versaoLeiaute,
      sequencial: i + 1,
    });
    const xmlAssinado = assinarEvento(xml, material);
    return { eventoId: ev.eventoId, id, alias, xmlAssinado };
  });

  // 4) Monta o lote (1..50) e envia.
  const loteXml = montarLote({
    grupo,
    ideEmpregador,
    ideTransmissor,
    eventos: preparados.map((p) => ({ id: p.id, xmlAssinado: p.xmlAssinado })),
  });

  const dataEnvio = new Date().toISOString();
  let retorno;
  try {
    retorno = await enviarLote({ loteXml, material, env, httpsModule });
  } catch (e) {
    // Falha de transporte: marca ERRO sem perder o payload.
    await Promise.all(
      preparados.map((p) =>
        repo.atualizar(p.eventoId, {
          status: ESTADO.ERRO,
          erros: JSON.stringify({ transporte: e.message }),
          dataEnvio,
        }),
      ),
    );
    throw e;
  }

  // 5) Persiste protocolo + estado ENVIADO/PROCESSANDO em cada evento.
  const statusInicial =
    retorno.cdResposta != null ? estadoPorCodigoLote(retorno.cdResposta) : ESTADO.ENVIADO;
  await Promise.all(
    preparados.map((p) =>
      repo.atualizar(p.eventoId, {
        status: statusInicial === ESTADO.REJEITADO ? ESTADO.REJEITADO : ESTADO.ENVIADO,
        idEvento: p.id,
        protocolo: retorno.protocolo || '',
        payloadXml: p.xmlAssinado,
        ambiente: cfg.tpAmb,
        versaoLeiaute: cfg.versaoLeiaute,
        dataEnvio,
        ...(retorno.ocorrencias?.length ? { erros: JSON.stringify(retorno.ocorrencias) } : {}),
      }),
    ),
  );

  log.info('Lote transmitido', {
    empresaId,
    protocolo: retorno.protocolo,
    cdResposta: retorno.cdResposta,
    qtdEventos: preparados.length,
    ambiente: cfg.ambienteNome,
  });

  return {
    protocolo: retorno.protocolo,
    cdResposta: retorno.cdResposta,
    ambiente: cfg.tpAmb,
    eventos: preparados.map((p) => ({ eventoId: p.eventoId, idEvento: p.id })),
  };
}

/**
 * Consulta o processamento de um lote por protocolo e atualiza os eventos.
 *
 * @param {object} p
 * @param {object} p.repo
 * @param {object} p.cofre
 * @param {string} p.empresaId
 * @param {string} p.protocolo
 * @param {string[]} p.eventoIds   ids dos documentos a atualizar
 * @param {object} [p.env]
 * @param {object} [p.httpsModule]
 */
async function atualizarPorConsulta({
  repo,
  cofre,
  empresaId,
  protocolo,
  eventoIds,
  env = process.env,
  httpsModule,
}) {
  const { material } = await carregarCertificado(cofre, empresaId);
  const retorno = await consultarLote({ protocolo, material, env, httpsModule });

  const dataRetorno = new Date().toISOString();
  const aceito = retorno.cdResposta != null && retorno.cdResposta < 300 && !!retorno.recibo;
  const status = aceito
    ? ESTADO.ACEITO
    : retorno.cdResposta >= 300
      ? ESTADO.REJEITADO
      : ESTADO.PROCESSANDO;

  await Promise.all(
    eventoIds.map((id) =>
      repo.atualizar(id, {
        status,
        ...(retorno.recibo ? { recibo: retorno.recibo } : {}),
        ...(retorno.ocorrencias?.length ? { erros: JSON.stringify(retorno.ocorrencias) } : {}),
        dataRetorno,
      }),
    ),
  );

  log.info('Consulta de lote aplicada', { empresaId, protocolo, status, cdResposta: retorno.cdResposta });
  return { status, recibo: retorno.recibo, cdResposta: retorno.cdResposta, ocorrencias: retorno.ocorrencias };
}

module.exports = { transmitirLote, atualizarPorConsulta, montarEvento, MONTADORES };
