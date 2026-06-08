'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-1000 — Informações do Empregador/Contribuinte (evento de TABELA).
 * É o primeiro evento a ser enviado (base cadastral do empregador).
 *
 * ATENÇÃO (Parte 3): a estrutura abaixo segue o leiaute documentado, mas DEVE
 * ser validada contra o XSD oficial (S-1.3) antes de transmitir — não invente
 * campos. Campos opcionais ausentes (dadosIsencao, infoOrgInternacional) são
 * omitidos quando não fornecidos.
 *
 * Gera o XML do evento SEM assinatura. A assinatura XMLDSig é aplicada depois
 * por `assinatura/xmldsig.js`.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb            1=produção, 2=produção restrita
 * @param {number} [dados.procEmi=1]      1=app do empregador
 * @param {string} [dados.verProc='BearERP'] versão do processo emissor
 * @param {number} dados.tpInsc           1=CNPJ, 2=CPF
 * @param {string} dados.nrInsc           p/ S-1000 é a RAIZ do CNPJ (8 dígitos)
 * @param {string} dados.iniValid         'aaaa-mm' (início da validade)
 * @param {string} [dados.fimValid]       'aaaa-mm' (opcional)
 * @param {object} dados.infoCadastro     bloco infoCadastro
 * @param {string} dados.infoCadastro.classTrib        classificação tributária
 * @param {number} [dados.infoCadastro.indCoop=0]
 * @param {number} [dados.infoCadastro.indConstr=0]
 * @param {number} [dados.infoCadastro.indDesFolha=0]
 * @param {number} [dados.infoCadastro.indOptRegEletron=1]
 * @param {object} [opts]
 * @param {string} [opts.versaoLeiaute='S-1.3']
 * @param {Date}   [opts.data=new Date()] momento p/ o Id
 * @param {number} [opts.sequencial=1]
 * @param {string} [opts.nsOverride]      força o namespace (debug/teste)
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS1000(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtInfoEmpregador';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({
    tpInsc: dados.tpInsc,
    nrInsc: dados.nrInsc,
    data,
    sequencial,
  });

  const ic = dados.infoCadastro;
  const corpo = el(alias, { Id: id }, [
    el('ideEvento', [
      el('tpAmb', dados.tpAmb),
      el('procEmi', dados.procEmi ?? 1),
      el('verProc', dados.verProc ?? 'BearERP'),
    ]),
    el('ideEmpregador', [
      el('tpInsc', dados.tpInsc),
      el('nrInsc', String(dados.nrInsc).replace(/\D/g, '')),
    ]),
    el('infoEmpregador', [
      el('inclusao', [
        el('idePeriodo', [
          el('iniValid', dados.iniValid),
          el('fimValid', dados.fimValid),
        ]),
        el('infoCadastro', [
          el('classTrib', ic.classTrib),
          el('indCoop', ic.indCoop ?? 0),
          el('indConstr', ic.indConstr ?? 0),
          el('indDesFolha', ic.indDesFolha ?? 0),
          el('indOptRegEletron', ic.indOptRegEletron ?? 1),
        ]),
      ]),
    ]),
  ]);

  const xml = `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
  return { id, xml, alias };
}

function validar(d) {
  const faltando = [];
  if (d.tpAmb !== 1 && d.tpAmb !== 2) faltando.push('tpAmb (1|2)');
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');
  if (!d.iniValid || !/^\d{4}-\d{2}$/.test(d.iniValid)) faltando.push('iniValid (aaaa-mm)');
  if (!d.infoCadastro) faltando.push('infoCadastro');
  else if (!d.infoCadastro.classTrib) faltando.push('infoCadastro.classTrib');
  if (faltando.length) {
    throw new Error(`S-1000 inválido — campos: ${faltando.join(', ')}`);
  }
}

module.exports = { montarS1000 };
