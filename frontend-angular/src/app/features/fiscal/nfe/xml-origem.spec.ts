import {
  MOTIVO_SEM_XML, NotaParaXml, ehDocumentoDeTerceiro, nomeArquivoXml, resolverOrigemXml,
} from './xml-origem';

const CNPJ_EMPRESA = '54893690000184';
const CNPJ_FORNEC = '12345678000199';
/** 43 dígitos (cUF+AAMM+CNPJ+mod+serie+nNF+tpEmis+cNF), sem o DV. */
const CHAVE43 = '3526081234567800019955001000053880100377173';
const CHAVE44 = CHAVE43 + '9';
const XML_FORNEC = '<nfeProc versao="4.00"><NFe><infNFe Id="NFe' + CHAVE44 + '">…</infNFe></NFe></nfeProc>';

function nota(sobrescreve: Partial<NotaParaXml> = {}): NotaParaXml {
  return { tipoOperacao: 'ENTRADA', emitenteCnpj: CNPJ_FORNEC, chaveAcesso: CHAVE44, xmlOriginal: XML_FORNEC, ...sobrescreve };
}

describe('ehDocumentoDeTerceiro', () => {
  it('ENTRADA é sempre de terceiro', () => {
    expect(ehDocumentoDeTerceiro({ tipoOperacao: 'ENTRADA' }, CNPJ_EMPRESA)).toBe(true);
    expect(ehDocumentoDeTerceiro({ tipoOperacao: 'entrada' }, CNPJ_EMPRESA)).toBe(true);
  });

  it('SAÍDA emitida pela própria empresa não é de terceiro', () => {
    expect(ehDocumentoDeTerceiro({ tipoOperacao: 'SAIDA', emitenteCnpj: CNPJ_EMPRESA }, CNPJ_EMPRESA)).toBe(false);
  });

  it('emitente diferente da empresa é de terceiro mesmo sem tipoOperacao', () => {
    expect(ehDocumentoDeTerceiro({ emitenteCnpj: CNPJ_FORNEC }, CNPJ_EMPRESA)).toBe(true);
  });

  it('compara só os dígitos (máscara não muda o veredito)', () => {
    expect(ehDocumentoDeTerceiro({ emitenteCnpj: '54.893.690/0001-84' }, CNPJ_EMPRESA)).toBe(false);
    expect(ehDocumentoDeTerceiro({ emitenteCnpj: CNPJ_EMPRESA }, '54.893.690/0001-84')).toBe(false);
  });

  it('nota nova, sem emitente gravado, conta como emissão própria', () => {
    expect(ehDocumentoDeTerceiro({ tipoOperacao: 'SAIDA' }, CNPJ_EMPRESA)).toBe(false);
    expect(ehDocumentoDeTerceiro({ emitenteCnpj: CNPJ_FORNEC }, '')).toBe(false);
  });
});

describe('resolverOrigemXml', () => {
  it('terceiro com XML guardado → devolve o ORIGINAL e a chave persistida', () => {
    const r = resolverOrigemXml(nota(), CNPJ_EMPRESA);
    expect(r.fonte).toBe('original');
    if (r.fonte !== 'original') return;
    expect(r.xml).toBe(XML_FORNEC);
    expect(r.chave).toBe(CHAVE44); // a chave do fornecedor, não uma recalculada
  });

  it('terceiro SEM XML guardado → indisponível, nunca regenera', () => {
    const r = resolverOrigemXml(nota({ xmlOriginal: undefined }), CNPJ_EMPRESA);
    expect(r.fonte).toBe('indisponivel');
    if (r.fonte !== 'indisponivel') return;
    expect(r.motivo).toBe(MOTIVO_SEM_XML);
  });

  it('xmlOriginal só com espaços conta como ausente', () => {
    expect(resolverOrigemXml(nota({ xmlOriginal: '   \n ' }), CNPJ_EMPRESA).fonte).toBe('indisponivel');
  });

  it('emissão própria → gerar pelo motor', () => {
    expect(resolverOrigemXml({ tipoOperacao: 'SAIDA', emitenteCnpj: CNPJ_EMPRESA }, CNPJ_EMPRESA).fonte).toBe('gerar');
  });

  it('emissão própria ignora um xmlOriginal residual e gera', () => {
    const r = resolverOrigemXml({ tipoOperacao: 'SAIDA', emitenteCnpj: CNPJ_EMPRESA, xmlOriginal: XML_FORNEC }, CNPJ_EMPRESA);
    expect(r.fonte).toBe('gerar');
  });

  it('regressão do bug: entrada do fornecedor não sai como emissão da empresa logada', () => {
    // Antes, "Ver XML" numa entrada chamava gerarXmlNotaFiscal e devolvia um XML
    // com <emit> da empresa logada e chave recalculada. Agora só há dois
    // desfechos possíveis para entrada — e nenhum deles é 'gerar'.
    expect(resolverOrigemXml(nota(), CNPJ_EMPRESA).fonte).not.toBe('gerar');
    expect(resolverOrigemXml(nota({ xmlOriginal: '' }), CNPJ_EMPRESA).fonte).not.toBe('gerar');
  });
});

describe('nomeArquivoXml', () => {
  it('usa a chave de 44 dígitos quando existe', () => {
    expect(nomeArquivoXml(CHAVE44, 53880)).toBe(`NFe${CHAVE44}.xml`);
  });

  it('cai no número quando a chave está ausente ou incompleta', () => {
    expect(nomeArquivoXml('', 53880)).toBe('NFe-53880.xml');
    expect(nomeArquivoXml(CHAVE43, 53880)).toBe('NFe-53880.xml');
  });

  it('sanitiza caracteres de caminho', () => {
    expect(nomeArquivoXml('', '../etc/passwd')).toBe('NFe-.._etc_passwd.xml');
  });
});
