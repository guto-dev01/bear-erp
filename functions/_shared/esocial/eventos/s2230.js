'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-2230 — Afastamento Temporário (evento NÃO PERIÓDICO, grupo 2).
 * Registra início e/ou término de afastamentos (doença, acidente, licença,
 * férias etc.). Um mesmo evento pode informar só o início, só o término (de um
 * afastamento já iniciado) ou ambos.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtAfastTemp antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente. Os blocos infoCessao,
 * infoMandSind e infoRetif ficam como extensão futura quando o XSD for
 * incorporado.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois pelo motor.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb
 * @param {number} [dados.procEmi=1]
 * @param {string} [dados.verProc='BearERP']
 * @param {number} dados.tpInsc
 * @param {string} dados.nrInsc
 * @param {object} dados.ideVinculo          { cpfTrab, matricula?, codCateg? }
 * @param {object} dados.infoAfastamento     { iniAfastamento?, fimAfastamento? }
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS2230(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtAfastTemp';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const iv = dados.ideVinculo;
  const ia = dados.infoAfastamento;
  const ini = ia.iniAfastamento;
  const fim = ia.fimAfastamento;

  const corpo = el(alias, { Id: id }, [
    el('ideEvento', [
      el('tpAmb', dados.tpAmb),
      el('procEmi', dados.procEmi ?? 1),
      el('verProc', dados.verProc ?? 'BearERP'),
    ]),
    el('ideEmpregador', [
      el('tpInsc', dados.tpInsc),
      el('nrInsc', soDigitos(dados.nrInsc)),
    ]),
    el('ideVinculo', [
      el('cpfTrab', soDigitos(iv.cpfTrab)),
      el('matricula', iv.matricula),
      el('codCateg', iv.codCateg),
    ]),
    el('infoAfastamento', [
      ini
        ? el('iniAfastamento', [
            el('dtIniAfast', ini.dtIniAfast),
            el('codMotAfast', ini.codMotAfast),
            el('infoMesmoMtv', ini.infoMesmoMtv),
            el('tpAcidTransito', ini.tpAcidTransito),
            el('observacao', ini.observacao),
            el('perAquis', ini.perAquis),
          ])
        : undefined,
      fim
        ? el('fimAfastamento', [el('dtTermAfast', fim.dtTermAfast)])
        : undefined,
    ]),
  ]);

  const xml = `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
  return { id, xml, alias };
}

function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function validar(d) {
  const faltando = [];
  if (d.tpAmb !== 1 && d.tpAmb !== 2) faltando.push('tpAmb (1|2)');
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  const iv = d.ideVinculo;
  if (!iv || !iv.cpfTrab) faltando.push('ideVinculo.cpfTrab');
  else if (soDigitos(iv.cpfTrab).length !== 11) faltando.push('ideVinculo.cpfTrab (11 dígitos)');

  const ia = d.infoAfastamento;
  if (!ia) faltando.push('infoAfastamento');
  else {
    const ini = ia.iniAfastamento;
    const fim = ia.fimAfastamento;
    if (!ini && !fim) faltando.push('infoAfastamento.iniAfastamento ou .fimAfastamento');
    if (ini) {
      if (!ehData(ini.dtIniAfast)) faltando.push('infoAfastamento.iniAfastamento.dtIniAfast (aaaa-mm-dd)');
      if (!ini.codMotAfast) faltando.push('infoAfastamento.iniAfastamento.codMotAfast');
    }
    if (fim && !ehData(fim.dtTermAfast)) faltando.push('infoAfastamento.fimAfastamento.dtTermAfast (aaaa-mm-dd)');
  }

  if (faltando.length) {
    throw new Error(`S-2230 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

module.exports = { montarS2230 };
