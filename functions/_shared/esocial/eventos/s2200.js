'use strict';

const { el } = require('../xml');
const { gerarId } = require('../ids');
const { nsEvento } = require('../namespaces');

/**
 * Evento S-2200 — Cadastramento Inicial do Vínculo e Admissão/Ingresso de
 * Trabalhador (evento NÃO PERIÓDICO, grupo 2). Cria o vínculo: dados pessoais,
 * documentação, endereço e o contrato de trabalho. Pré-requisito do S-1200.
 *
 * ATENÇÃO (mesma ressalva do S-1000): a estrutura/ordem dos elementos, os nomes
 * de campo e as ENUMERAÇÕES abaixo seguem o leiaute documentado S-1.3, mas DEVEM
 * ser confirmados contra o XSD oficial do evtAdmissao antes de transmitir em
 * produção — não invente campos; o MOD é a fonte da verdade. A validação aqui é
 * por REGRAS em JS (`validar`), não por XSD.
 *
 * Campos opcionais ausentes são omitidos automaticamente. O leiaute do S-2200 é
 * o mais extenso do eSocial (dependentes, aprendiz, sucessão, afastamento na
 * admissão, trabalhador imigrante, alvará judicial etc.); aqui modelamos o
 * NÚCLEO (trabalhador + nascimento + endereço + vínculo CLT + contrato) e os
 * blocos acessórios ficam como extensão futura quando o XSD for incorporado.
 *
 * Gera o XML do evento SEM assinatura — a XMLDSig é aplicada depois pelo motor.
 *
 * @param {object} dados
 * @param {number} dados.tpAmb
 * @param {number} [dados.procEmi=1]
 * @param {string} [dados.verProc='BearERP']
 * @param {number} [dados.indRetif=1]
 * @param {string} [dados.nrRecibo]           obrigatório quando indRetif=2
 * @param {number} dados.tpInsc
 * @param {string} dados.nrInsc
 * @param {object} dados.trabalhador          dados pessoais + nascimento + endereço
 * @param {object} dados.vinculo              contrato de trabalho
 * @param {object} [opts]
 * @returns {{ id: string, xml: string, alias: string }}
 */
function montarS2200(dados, opts = {}) {
  const {
    versaoLeiaute = 'S-1.3',
    data = new Date(),
    sequencial = 1,
    nsOverride,
  } = opts;

  const alias = 'evtAdmissao';
  const ns = nsEvento(alias, versaoLeiaute, { override: nsOverride });

  validar(dados);

  const id = gerarId({ tpInsc: dados.tpInsc, nrInsc: dados.nrInsc, data, sequencial });

  const corpo = el(alias, { Id: id }, [
    el('ideEvento', [
      el('indRetif', dados.indRetif ?? 1),
      el('nrRecibo', dados.indRetif === 2 ? dados.nrRecibo : undefined),
      el('tpAmb', dados.tpAmb),
      el('procEmi', dados.procEmi ?? 1),
      el('verProc', dados.verProc ?? 'BearERP'),
    ]),
    el('ideEmpregador', [
      el('tpInsc', dados.tpInsc),
      el('nrInsc', soDigitos(dados.nrInsc)),
    ]),
    blocoTrabalhador(dados.trabalhador),
    blocoVinculo(dados.vinculo),
  ]);

  const xml = `<eSocial xmlns="${ns}">${corpo}</eSocial>`;
  return { id, xml, alias };
}

function blocoTrabalhador(t) {
  const n = t.nascimento || {};
  const end = t.endereco || {};
  const br = end.brasil;
  const ext = end.exterior;
  return el('trabalhador', [
    el('cpfTrab', soDigitos(t.cpfTrab)),
    el('nmTrab', t.nmTrab),
    el('sexo', t.sexo),
    el('racaCor', t.racaCor),
    el('estCiv', t.estCiv),
    el('grauInstr', t.grauInstr),
    el('nmSoc', t.nmSoc),
    el('nascimento', [
      el('dtNascto', n.dtNascto),
      el('codMunic', n.codMunic),
      el('uf', n.uf),
      el('paisNascto', n.paisNascto),
      el('paisNac', n.paisNac),
    ]),
    el('endereco', [
      br
        ? el('brasil', [
            el('tpLograd', br.tpLograd),
            el('dscLograd', br.dscLograd),
            el('nrLograd', br.nrLograd),
            el('complemento', br.complemento),
            el('bairro', br.bairro),
            el('cep', br.cep ? soDigitos(br.cep) : undefined),
            el('codMunic', br.codMunic),
            el('uf', br.uf),
          ])
        : undefined,
      ext
        ? el('exterior', [
            el('paisResid', ext.paisResid),
            el('dscLograd', ext.dscLograd),
            el('nrLograd', ext.nrLograd),
            el('nmCid', ext.nmCid),
            el('codPostal', ext.codPostal),
          ])
        : undefined,
    ]),
  ]);
}

function blocoVinculo(v) {
  const irt = v.infoRegimeTrab || {};
  const cel = irt.infoCeletista;
  const est = irt.infoEstatutario;
  const ic = v.infoContrato || {};
  const rem = ic.remuneracao || {};
  const dur = ic.duracao || {};
  const loc = ic.localTrabalho || {};
  const lg = loc.localTrabGeral;
  const hor = ic.horContratual;
  return el('vinculo', [
    el('matricula', v.matricula),
    el('tpRegTrab', v.tpRegTrab),
    el('tpRegPrev', v.tpRegPrev),
    el('cadIni', v.cadIni),
    el('infoRegimeTrab', [
      cel
        ? el('infoCeletista', [
            el('dtAdm', cel.dtAdm),
            el('tpAdmissao', cel.tpAdmissao),
            el('indAdmissao', cel.indAdmissao),
            el('tpRegJor', cel.tpRegJor),
            el('natAtividade', cel.natAtividade),
            el('dtBase', cel.dtBase),
            el('cnpjSindCategProf', cel.cnpjSindCategProf ? soDigitos(cel.cnpjSindCategProf) : undefined),
          ])
        : undefined,
      est
        ? el('infoEstatutario', [
            el('tpProv', est.tpProv),
            el('dtNomeacao', est.dtNomeacao),
            el('dtPosse', est.dtPosse),
            el('dtExercicio', est.dtExercicio),
          ])
        : undefined,
    ]),
    el('infoContrato', [
      el('nmCargo', ic.nmCargo),
      el('codCargo', ic.codCargo),
      el('codFuncao', ic.codFuncao),
      el('codCateg', ic.codCateg),
      el('remuneracao', [
        el('vrSalFx', rem.vrSalFx),
        el('undSalFixo', rem.undSalFixo),
        el('dscSalVar', rem.dscSalVar),
      ]),
      el('duracao', [
        el('tpContr', dur.tpContr),
        el('dtTerm', dur.dtTerm),
        el('clausAssec', dur.clausAssec),
        el('objDet', dur.objDet),
      ]),
      el('localTrabalho', [
        lg
          ? el('localTrabGeral', [
              el('tpInsc', lg.tpInsc),
              el('nrInsc', soDigitos(lg.nrInsc)),
              el('descComp', lg.descComp),
            ])
          : undefined,
      ]),
      hor
        ? el('horContratual', [
            el('qtdHrsSem', hor.qtdHrsSem),
            el('tpJornada', hor.tpJornada),
            el('dscTpJorn', hor.dscTpJorn),
            el('tmpParc', hor.tmpParc),
          ])
        : undefined,
    ]),
  ]);
}

function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function validar(d) {
  const faltando = [];
  if (d.tpAmb !== 1 && d.tpAmb !== 2) faltando.push('tpAmb (1|2)');
  if (d.indRetif === 2 && !d.nrRecibo) faltando.push('nrRecibo (obrigatório quando indRetif=2)');
  if (d.tpInsc !== 1 && d.tpInsc !== 2) faltando.push('tpInsc (1|2)');
  if (!d.nrInsc) faltando.push('nrInsc');

  const t = d.trabalhador;
  if (!t) faltando.push('trabalhador');
  else {
    if (!t.cpfTrab) faltando.push('trabalhador.cpfTrab');
    else if (soDigitos(t.cpfTrab).length !== 11) faltando.push('trabalhador.cpfTrab (11 dígitos)');
    if (!t.nmTrab) faltando.push('trabalhador.nmTrab');
    if (t.sexo !== 'M' && t.sexo !== 'F') faltando.push('trabalhador.sexo (M|F)');
    if (t.racaCor == null) faltando.push('trabalhador.racaCor');
    if (t.grauInstr == null) faltando.push('trabalhador.grauInstr');
    if (!t.nascimento || !ehData(t.nascimento.dtNascto)) faltando.push('trabalhador.nascimento.dtNascto (aaaa-mm-dd)');
    if (!t.nascimento || !t.nascimento.paisNac) faltando.push('trabalhador.nascimento.paisNac');
    const br = t.endereco && t.endereco.brasil;
    const ext = t.endereco && t.endereco.exterior;
    if (!br && !ext) faltando.push('trabalhador.endereco.brasil ou .exterior');
    if (br) {
      if (!br.dscLograd) faltando.push('trabalhador.endereco.brasil.dscLograd');
      if (!br.cep) faltando.push('trabalhador.endereco.brasil.cep');
      if (!br.codMunic) faltando.push('trabalhador.endereco.brasil.codMunic');
      if (!br.uf || !/^[A-Z]{2}$/.test(String(br.uf))) faltando.push('trabalhador.endereco.brasil.uf (2 letras)');
    }
  }

  const v = d.vinculo;
  if (!v) {
    faltando.push('vinculo');
    lancar(faltando);
    return;
  }
  if (v.tpRegTrab == null) faltando.push('vinculo.tpRegTrab (1=CLT|2=estatutário)');
  if (v.tpRegPrev == null) faltando.push('vinculo.tpRegPrev (1=RGPS|2=RPPS|3=exterior)');

  const cel = v.infoRegimeTrab && v.infoRegimeTrab.infoCeletista;
  const est = v.infoRegimeTrab && v.infoRegimeTrab.infoEstatutario;
  if (!cel && !est) faltando.push('vinculo.infoRegimeTrab.infoCeletista ou .infoEstatutario');
  if (cel) {
    if (!ehData(cel.dtAdm)) faltando.push('vinculo.infoRegimeTrab.infoCeletista.dtAdm (aaaa-mm-dd)');
    if (cel.tpAdmissao == null) faltando.push('vinculo.infoRegimeTrab.infoCeletista.tpAdmissao');
    if (cel.tpRegJor == null) faltando.push('vinculo.infoRegimeTrab.infoCeletista.tpRegJor');
    if (cel.natAtividade == null) faltando.push('vinculo.infoRegimeTrab.infoCeletista.natAtividade');
  }
  if (est && !ehData(est.dtExercicio)) faltando.push('vinculo.infoRegimeTrab.infoEstatutario.dtExercicio (aaaa-mm-dd)');

  const ic = v.infoContrato;
  if (!ic) faltando.push('vinculo.infoContrato');
  else {
    if (!ic.codCateg) faltando.push('vinculo.infoContrato.codCateg');
    if (!ic.remuneracao || ic.remuneracao.vrSalFx == null) faltando.push('vinculo.infoContrato.remuneracao.vrSalFx');
    if (!ic.remuneracao || ic.remuneracao.undSalFixo == null) faltando.push('vinculo.infoContrato.remuneracao.undSalFixo');
    if (!ic.duracao || ic.duracao.tpContr == null) faltando.push('vinculo.infoContrato.duracao.tpContr');
    const lg = ic.localTrabalho && ic.localTrabalho.localTrabGeral;
    if (!lg || lg.tpInsc == null || !lg.nrInsc) faltando.push('vinculo.infoContrato.localTrabalho.localTrabGeral (tpInsc+nrInsc)');
  }

  lancar(faltando);
}

function lancar(faltando) {
  if (faltando.length) {
    throw new Error(`S-2200 inválido — campos: ${faltando.join(', ')}`);
  }
}

function ehData(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

module.exports = { montarS2200 };
