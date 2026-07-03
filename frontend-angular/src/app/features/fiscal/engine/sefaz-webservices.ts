/**
 * Endpoints dos Web Services da NF-e (modelo 55, layout 4.00) — módulo PURO.
 *
 * Roteia UF → autorizador (SEFAZ própria, SVRS, SVAN) e resolve a URL do serviço
 * no ambiente desejado. É o dado que a Appwrite Function `nfe-transmissao`
 * (etapa [4] de EMISSAO-NFE.md) consome para saber PARA ONDE enviar.
 *
 * ⚠️ PROVENIÊNCIA E VALIDAÇÃO
 * URLs transcritas de pesquisa no Portal Nacional da NF-e
 * (https://www.nfe.fazenda.gov.br/portal/ → Serviços > Web Services),
 * referência de 23/06/2026. Esses endereços MUDAM por Nota Técnica — VALIDE
 * cada um contra o portal/MOC (Anexo I) antes de transmitir em produção. Este
 * módulo é a fonte ÚNICA a corrigir quando algo mudar.
 *
 * Lacunas conhecidas (SEFAZ própria, endpoints ainda não mapeados aqui): AM, GO,
 * MS, MT, PE. Para essas UFs `urlWebService` devolve null (exceto serviços
 * nacionais como NFeDistribuicaoDFe).
 *
 * Sem dependência de Angular nem de runtime externo: roda no front e em Node.
 */

export type AmbienteSefaz = 'producao' | 'homologacao';

export type ServicoNFe =
  | 'NFeAutorizacao4'
  | 'NFeRetAutorizacao4'
  | 'NFeStatusServico4'
  | 'NFeConsultaProtocolo4'
  | 'NFeInutilizacao4'
  | 'NfeConsultaCadastro4'
  | 'NFeRecepcaoEvento4'
  | 'NFeDistribuicaoDFe';

/** Autorizadores cobertos. SVCAN/SVCRS são os ambientes de contingência. */
export type Autorizador = 'SP' | 'MG' | 'RS' | 'PR' | 'BA' | 'SVAN' | 'SVRS' | 'SVCAN' | 'SVCRS' | 'AN';

type Mapa = Partial<Record<ServicoNFe, string>>;

// ────────────────────────────────────────────────────────────
// Construtores por "estilo" de URL (cada SEFAZ expõe a sua convenção)
// ────────────────────────────────────────────────────────────

/** SP: caminho plano em /ws/<servico>.asmx. */
function estiloSP(host: string): Mapa {
  const f = (s: string) => `https://${host}/ws/${s}`;
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

/** RS/SVRS: uma pasta por serviço; ConsultaCadastro num host dedicado. */
function estiloRS(host: string, cadHost: string): Mapa {
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

/** BA: /webservices/<Svc>/<Svc>.asmx, com ConsultaCadastro no mesmo host. */
function estiloBA(host: string): Mapa {
  const f = (s: string) => `https://${host}/webservices/${s}/${s}.asmx`;
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

/** MG: /nfe2/services/<Svc> (sem .asmx). */
function estiloMG(host: string): Mapa {
  const f = (s: string) => `https://${host}/nfe2/services/${s}`;
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

/** PR: /nfe/<Svc>4?wsdl (o servidor responde SOAP e WSDL na mesma URL). */
function estiloPR(host: string): Mapa {
  const f = (s: string) => `https://${host}/nfe/${s}?wsdl`;
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

/** Ambiente nacional (SVAN/SVC-AN): /<Svc>/<Svc>.asmx; sem ConsultaCadastro. */
function estiloNacional(host: string, cadHost?: string): Mapa {
  const f = (s: string) => `https://${host}/${s}/${s}.asmx`;
  const m: Mapa = {
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

// ────────────────────────────────────────────────────────────
// Tabela de endpoints por autorizador e ambiente
// ────────────────────────────────────────────────────────────

const ENDPOINTS: Record<Autorizador, Record<AmbienteSefaz, Mapa>> = {
  SP: {
    producao: estiloSP('nfe.fazenda.sp.gov.br'),
    homologacao: estiloSP('homologacao.nfe.fazenda.sp.gov.br'),
  },
  MG: {
    producao: estiloMG('nfe.fazenda.mg.gov.br'),
    homologacao: estiloMG('hnfe.fazenda.mg.gov.br'),
  },
  RS: {
    producao: estiloRS('nfe.sefazrs.rs.gov.br', 'cad.svrs.rs.gov.br'),
    homologacao: estiloRS('nfe-homologacao.sefazrs.rs.gov.br', 'cad.svrs.rs.gov.br'),
  },
  PR: {
    producao: estiloPR('nfe.sefa.pr.gov.br'),
    homologacao: estiloPR('homologacao.nfe.sefa.pr.gov.br'),
  },
  BA: {
    producao: estiloBA('nfe.sefaz.ba.gov.br'),
    homologacao: estiloBA('hnfe.sefaz.ba.gov.br'),
  },
  SVRS: {
    producao: estiloRS('nfe.svrs.rs.gov.br', 'cad.svrs.rs.gov.br'),
    homologacao: estiloRS('nfe-homologacao.svrs.rs.gov.br', 'cad.svrs.rs.gov.br'),
  },
  SVAN: {
    producao: estiloNacional('www.sefazvirtual.fazenda.gov.br'),
    homologacao: estiloNacional('hom.nfe.fazenda.gov.br', 'hom.sefazvirtual.fazenda.gov.br'),
  },
  // Contingência — compartilham a infraestrutura nacional/SVRS.
  SVCAN: {
    producao: estiloNacional('www.sefazvirtual.fazenda.gov.br'),
    homologacao: estiloNacional('hom.nfe.fazenda.gov.br', 'hom.sefazvirtual.fazenda.gov.br'),
  },
  SVCRS: {
    producao: estiloRS('nfe.svrs.rs.gov.br', 'cad.svrs.rs.gov.br'),
    homologacao: estiloRS('nfe-homologacao.svrs.rs.gov.br', 'cad.svrs.rs.gov.br'),
  },
  // Receita Federal — serviços nacionais (DistribuicaoDFe + RecepcaoEvento p/ manifestação).
  AN: {
    producao: {
      NFeDistribuicaoDFe: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
      NFeRecepcaoEvento4: 'https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    },
    homologacao: {
      NFeDistribuicaoDFe: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
      NFeRecepcaoEvento4: 'https://hom.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    },
  },
};

// ────────────────────────────────────────────────────────────
// Roteamento UF → autorizador (operação normal)
// ────────────────────────────────────────────────────────────

const AUTORIZADOR_POR_UF: Record<string, Autorizador | null> = {
  // SEFAZ própria mapeada
  SP: 'SP', MG: 'MG', RS: 'RS', PR: 'PR', BA: 'BA',
  // SEFAZ própria SEM endpoints mapeados aqui (lacuna conhecida)
  AM: null, GO: null, MS: null, MT: null, PE: null,
  // SVAN
  MA: 'SVAN',
  // SVRS
  AC: 'SVRS', AL: 'SVRS', AP: 'SVRS', CE: 'SVRS', DF: 'SVRS', ES: 'SVRS', PA: 'SVRS',
  PB: 'SVRS', PI: 'SVRS', RJ: 'SVRS', RN: 'SVRS', RO: 'SVRS', RR: 'SVRS', SC: 'SVRS', SE: 'SVRS', TO: 'SVRS',
};

/** Autorizador de uma UF em operação normal (null se UF inválida/não mapeada). */
export function autorizadorDaUf(uf: string): Autorizador | null {
  return AUTORIZADOR_POR_UF[(uf || '').toUpperCase()] ?? null;
}

/**
 * Resolve a URL de um serviço para a UF/ambiente. Serviços nacionais
 * (NFeDistribuicaoDFe) usam o Ambiente Nacional (AN) independentemente da UF.
 * Devolve null quando a UF não está mapeada ou o autorizador não expõe o serviço.
 */
export function urlWebService(uf: string, servico: ServicoNFe, ambiente: AmbienteSefaz = 'homologacao'): string | null {
  if (servico === 'NFeDistribuicaoDFe') return ENDPOINTS.AN[ambiente].NFeDistribuicaoDFe ?? null;
  const autorizador = autorizadorDaUf(uf);
  if (!autorizador) return null;
  return ENDPOINTS[autorizador][ambiente][servico] ?? null;
}

/** Acesso direto a um autorizador (inclusive contingência SVCAN/SVCRS). */
export function urlPorAutorizador(autorizador: Autorizador, servico: ServicoNFe, ambiente: AmbienteSefaz = 'homologacao'): string | null {
  return ENDPOINTS[autorizador]?.[ambiente]?.[servico] ?? null;
}
