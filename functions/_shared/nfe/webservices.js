'use strict';

/**
 * Endpoints dos WebServices da NF-e (modelo 55, layout 4.00) — lado Function.
 *
 * Porte CommonJS do resolvedor do frontend
 * (frontend-angular/.../engine/sefaz-webservices.ts). MANTENHA OS DOIS EM SINCRONIA.
 *
 * ⚠️ URLs transcritas de pesquisa no Portal Nacional da NF-e (ref. 23/06/2026);
 * mudam por Nota Técnica — VALIDE antes de produção. Lacunas (própria não
 * mapeada): AM, GO, MS, MT, PE.
 */

function estiloSP(host) {
  const f = (s) => `https://${host}/ws/${s}`;
  return {
    NFeAutorizacao4: f('nfeautorizacao4.asmx'),
    NFeRetAutorizacao4: f('nferetautorizacao4.asmx'),
    NFeStatusServico4: f('nfestatusservico4.asmx'),
    NFeConsultaProtocolo4: f('nfeconsultaprotocolo4.asmx'),
    NFeInutilizacao4: f('nfeinutilizacao4.asmx'),
    NfeConsultaCadastro4: f('cadconsultacadastro4.asmx'),
    NFeRecepcaoEvento4: f('nferecepcaoevento4.asmx'),
  };
}

function estiloRS(host, cadHost) {
  return {
    NFeAutorizacao4: `https://${host}/ws/NfeAutorizacao/NFeAutorizacao4.asmx`,
    NFeRetAutorizacao4: `https://${host}/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx`,
    NFeStatusServico4: `https://${host}/ws/NfeStatusServico/NfeStatusServico4.asmx`,
    NFeConsultaProtocolo4: `https://${host}/ws/NfeConsulta/NfeConsulta4.asmx`,
    NFeInutilizacao4: `https://${host}/ws/nfeinutilizacao/nfeinutilizacao4.asmx`,
    NfeConsultaCadastro4: `https://${cadHost}/ws/cadconsultacadastro/cadconsultacadastro4.asmx`,
    NFeRecepcaoEvento4: `https://${host}/ws/recepcaoevento/recepcaoevento4.asmx`,
  };
}

function estiloBA(host) {
  const f = (s) => `https://${host}/webservices/${s}/${s}.asmx`;
  return {
    NFeAutorizacao4: f('NFeAutorizacao4'),
    NFeRetAutorizacao4: f('NFeRetAutorizacao4'),
    NFeStatusServico4: f('NFeStatusServico4'),
    NFeConsultaProtocolo4: f('NFeConsultaProtocolo4'),
    NFeInutilizacao4: f('NFeInutilizacao4'),
    NfeConsultaCadastro4: f('CadConsultaCadastro4'),
    NFeRecepcaoEvento4: f('NFeRecepcaoEvento4'),
  };
}

function estiloMG(host) {
  const f = (s) => `https://${host}/nfe2/services/${s}`;
  return {
    NFeAutorizacao4: f('NFeAutorizacao4'),
    NFeRetAutorizacao4: f('NFeRetAutorizacao4'),
    NFeStatusServico4: f('NFeStatusServico4'),
    NFeConsultaProtocolo4: f('NFeConsultaProtocolo4'),
    NFeInutilizacao4: f('NFeInutilizacao4'),
    NfeConsultaCadastro4: f('CadConsultaCadastro4'),
    NFeRecepcaoEvento4: f('NFeRecepcaoEvento4'),
  };
}

function estiloPR(host) {
  const f = (s) => `https://${host}/nfe/${s}?wsdl`;
  return {
    NFeAutorizacao4: f('NFeAutorizacao4'),
    NFeRetAutorizacao4: f('NFeRetAutorizacao4'),
    NFeStatusServico4: f('NFeStatusServico4'),
    NFeConsultaProtocolo4: f('NFeConsultaProtocolo4'),
    NFeInutilizacao4: f('NFeInutilizacao4'),
    NfeConsultaCadastro4: f('CadConsultaCadastro4'),
    NFeRecepcaoEvento4: f('NFeRecepcaoEvento4'),
  };
}

function estiloNacional(host, cadHost) {
  const f = (s) => `https://${host}/${s}/${s}.asmx`;
  const m = {
    NFeAutorizacao4: f('NFeAutorizacao4'),
    NFeRetAutorizacao4: f('NFeRetAutorizacao4'),
    NFeStatusServico4: f('NFeStatusServico4'),
    NFeConsultaProtocolo4: f('NFeConsultaProtocolo4'),
    NFeInutilizacao4: f('NFeInutilizacao4'),
    NFeRecepcaoEvento4: f('NFeRecepcaoEvento4'),
  };
  if (cadHost) m.NfeConsultaCadastro4 = `https://${cadHost}/CadConsultaCadastro4/CadConsultaCadastro4.asmx`;
  return m;
}

const ENDPOINTS = {
  SP: { producao: estiloSP('nfe.fazenda.sp.gov.br'), homologacao: estiloSP('homologacao.nfe.fazenda.sp.gov.br') },
  MG: { producao: estiloMG('nfe.fazenda.mg.gov.br'), homologacao: estiloMG('hnfe.fazenda.mg.gov.br') },
  RS: { producao: estiloRS('nfe.sefazrs.rs.gov.br', 'cad.svrs.rs.gov.br'), homologacao: estiloRS('nfe-homologacao.sefazrs.rs.gov.br', 'cad.svrs.rs.gov.br') },
  PR: { producao: estiloPR('nfe.sefa.pr.gov.br'), homologacao: estiloPR('homologacao.nfe.sefa.pr.gov.br') },
  BA: { producao: estiloBA('nfe.sefaz.ba.gov.br'), homologacao: estiloBA('hnfe.sefaz.ba.gov.br') },
  SVRS: { producao: estiloRS('nfe.svrs.rs.gov.br', 'cad.svrs.rs.gov.br'), homologacao: estiloRS('nfe-homologacao.svrs.rs.gov.br', 'cad.svrs.rs.gov.br') },
  SVAN: { producao: estiloNacional('www.sefazvirtual.fazenda.gov.br'), homologacao: estiloNacional('hom.nfe.fazenda.gov.br', 'hom.sefazvirtual.fazenda.gov.br') },
  SVCAN: { producao: estiloNacional('www.sefazvirtual.fazenda.gov.br'), homologacao: estiloNacional('hom.nfe.fazenda.gov.br', 'hom.sefazvirtual.fazenda.gov.br') },
  SVCRS: { producao: estiloRS('nfe.svrs.rs.gov.br', 'cad.svrs.rs.gov.br'), homologacao: estiloRS('nfe-homologacao.svrs.rs.gov.br', 'cad.svrs.rs.gov.br') },
  AN: {
    producao: {
      NFeDistribuicaoDFe: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
      // Manifestação do Destinatário é recebida pelo Ambiente Nacional.
      NFeRecepcaoEvento4: 'https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    },
    homologacao: {
      NFeDistribuicaoDFe: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
      NFeRecepcaoEvento4: 'https://hom.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    },
  },
};

const AUTORIZADOR_POR_UF = {
  SP: 'SP', MG: 'MG', RS: 'RS', PR: 'PR', BA: 'BA',
  AM: null, GO: null, MS: null, MT: null, PE: null,
  MA: 'SVAN',
  AC: 'SVRS', AL: 'SVRS', AP: 'SVRS', CE: 'SVRS', DF: 'SVRS', ES: 'SVRS', PA: 'SVRS',
  PB: 'SVRS', PI: 'SVRS', RJ: 'SVRS', RN: 'SVRS', RO: 'SVRS', RR: 'SVRS', SC: 'SVRS', SE: 'SVRS', TO: 'SVRS',
};

/** UF → código IBGE (cUF), usado no consStatServ e na chave. */
const CUF = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27', SE: '28', BA: '29',
  MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41', SC: '42', RS: '43',
  MS: '50', MT: '51', GO: '52', DF: '53',
};

function autorizadorDaUf(uf) {
  return AUTORIZADOR_POR_UF[(uf || '').toUpperCase()] || null;
}

function cufDaUf(uf) {
  return CUF[(uf || '').toUpperCase()] || null;
}

/** Resolve a URL de um serviço para a UF/ambiente (null se não mapeado). */
function urlWebService(uf, servico, ambiente = 'homologacao') {
  if (servico === 'NFeDistribuicaoDFe') return ENDPOINTS.AN[ambiente].NFeDistribuicaoDFe || null;
  const autorizador = autorizadorDaUf(uf);
  if (!autorizador) return null;
  return (ENDPOINTS[autorizador][ambiente] || {})[servico] || null;
}

function urlPorAutorizador(autorizador, servico, ambiente = 'homologacao') {
  return ((ENDPOINTS[autorizador] || {})[ambiente] || {})[servico] || null;
}

module.exports = { autorizadorDaUf, cufDaUf, urlWebService, urlPorAutorizador };
