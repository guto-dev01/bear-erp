import { Injectable } from '@angular/core';
import * as forge from 'node-forge';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

export interface CertificadoDoc {
  $id: string;
  tipo: string;
  nome: string;
  cnpjCpf: string;
  emissor?: string;
  serialNumber?: string;
  dataValidade: string;
  status: string;
  storageFileId?: string;
  empresaId: string;
  tenantId: string;
  $createdAt?: string;
}

/** Metadados lidos do .pfx (nada sensível: sem chave privada nem senha). */
interface MetaCert {
  titular: string | null;
  cnpjCpf: string | null;
  serialNumber: string;
  emissor: string | null;
  validoDe: Date;
  validoAte: Date;
}

const COLLECTION = 'certificados';

@Injectable({ providedIn: 'root' })
export class CertificadoImportService {
  constructor(private appwrite: AppwriteService, private auth: AuthService) {}

  private tenantId(): string { return this.auth.tenantId() || 'default'; }
  private empresaId(): string { return this.auth.empresaId() || ''; }

  /** Certificado A1 mais recente da empresa atual (ou null). */
  carregarAtual(): Observable<CertificadoDoc | null> {
    const Q = this.appwrite.query;
    const queries = [Q.limit(10), Q.orderDesc('$createdAt'), Q.equal('tenantId', this.tenantId()), Q.equal('tipo', 'A1')];
    const empresa = this.empresaId();
    if (empresa) queries.push(Q.equal('empresaId', empresa));
    return this.appwrite.listDocuments<CertificadoDoc>(COLLECTION, queries).pipe(
      map((lista) => {
        if (!lista?.length) return null;
        // Prefere um certificado ainda válido (não revogado); senão, o mais recente.
        return lista.find((c) => c.status !== 'REVOGADO' && !!c.storageFileId) ?? lista[0];
      }),
    );
  }

  /**
   * Importa um A1: abre/valida o .pfx (senha), envia o arquivo ao cofre,
   * grava os metadados + senha cifrada e vincula à empresa.
   * Lança erro de senha incorreta ANTES de qualquer upload.
   */
  async importar(file: File, senha: string): Promise<CertificadoDoc> {
    const der = await file.arrayBuffer();
    const meta = lerPkcs12(der, senha); // valida a senha; lança se incorreta

    const senhaCifrada = await cifrarSenha(senha);
    const userId = this.auth.user()?.id;

    // 1) Arquivo .pfx no bucket privado.
    const fileDoc = await firstValueFrom(this.appwrite.createFile(environment.appwrite.certBucketId, file, userId));

    try {
      // 2) Documento de metadados + senha cifrada + ponteiro pro arquivo.
      const data: Record<string, unknown> = {
        nome: meta.titular || file.name.replace(/\.(pfx|p12)$/i, ''),
        tipo: 'A1',
        cnpjCpf: meta.cnpjCpf ?? '',
        emissor: meta.emissor ?? '',
        serialNumber: meta.serialNumber ?? '',
        dataValidade: meta.validoAte.toISOString().slice(0, 10),
        status: 'ATIVO',
        totalOperacoes: 0,
        storageFileId: fileDoc.$id,
        senhaCert: senhaCifrada,
        empresaId: this.empresaId(),
        tenantId: this.tenantId(),
        createdAt: new Date().toISOString(),
      };
      const cert = await firstValueFrom(this.appwrite.createDocument<CertificadoDoc>(COLLECTION, data));

      // 3) Vincula à empresa (best-effort — não derruba o import se falhar).
      const empresa = this.empresaId();
      if (empresa) {
        try {
          await firstValueFrom(this.appwrite.updateDocument('empresas', empresa, { certificadoDigitalId: cert.$id }));
        } catch { /* empresa pode não existir como documento; segue */ }
      }
      return cert;
    } catch (e) {
      // Evita arquivo órfão no cofre se a gravação do documento falhar.
      try { await firstValueFrom(this.appwrite.deleteFile(environment.appwrite.certBucketId, fileDoc.$id)); } catch { /* ignore */ }
      throw e;
    }
  }
}

// ── Leitura PKCS#12 (espelha functions/_shared/certificado/pkcs12.js) ──────────

/** CN no padrão ICP-Brasil "NOME:DOC" → documento (CPF/CNPJ) só com dígitos. */
function extrairCnpjCpf(commonName: string | null): string | null {
  if (!commonName) return null;
  const idx = commonName.lastIndexOf(':');
  if (idx === -1) return null;
  const doc = commonName.slice(idx + 1).replace(/\D/g, '');
  return doc.length === 11 || doc.length === 14 ? doc : null;
}

/** Nome do titular sem o sufixo ":DOC". */
function extrairTitular(commonName: string | null): string | null {
  if (!commonName) return null;
  const idx = commonName.lastIndexOf(':');
  return idx === -1 ? commonName : commonName.slice(0, idx);
}

function cn(attrs: forge.pki.Certificate['subject']): string | null {
  const a = attrs?.getField?.('CN');
  return a ? (a.value as string) : null;
}

function casaChave(cert: forge.pki.Certificate, chave: forge.pki.rsa.PrivateKey): boolean {
  try {
    const pub = cert.publicKey as forge.pki.rsa.PublicKey;
    return !!(pub && chave.n && pub.n && pub.n.toString(16) === chave.n.toString(16));
  } catch {
    return false;
  }
}

function lerPkcs12(der: ArrayBuffer, senha: string): MetaCert {
  if (!der || der.byteLength === 0) throw new Error('Arquivo de certificado vazio.');

  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const bin = arrayBufferParaBinaryString(der);
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(bin));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);
  } catch {
    throw new Error('Não foi possível abrir o certificado: senha incorreta ou arquivo inválido.');
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids['certBag'] })[forge.pki.oids['certBag']] || [];
  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids['pkcs8ShroudedKeyBag'] })[forge.pki.oids['pkcs8ShroudedKeyBag']] || []),
    ...(p12.getBags({ bagType: forge.pki.oids['keyBag'] })[forge.pki.oids['keyBag']] || []),
  ];

  if (certBags.length === 0) throw new Error('O arquivo não contém certificado.');
  if (keyBags.length === 0) throw new Error('O arquivo não contém chave privada (não é um A1 válido).');

  const chave = keyBags[0].key as forge.pki.rsa.PrivateKey;
  const certs = certBags.map((b) => b.cert).filter(Boolean) as forge.pki.Certificate[];

  let leaf = certs.find((c) => casaChave(c, chave));
  if (!leaf) leaf = certs[0];

  const cnTitular = cn(leaf.subject);
  return {
    titular: extrairTitular(cnTitular),
    cnpjCpf: extrairCnpjCpf(cnTitular),
    serialNumber: leaf.serialNumber,
    emissor: cn(leaf.issuer),
    validoDe: leaf.validity.notBefore,
    validoAte: leaf.validity.notAfter,
  };
}

function arrayBufferParaBinaryString(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return bin;
}

// ── Cifragem da senha (AES-256-GCM via Web Crypto) ─────────────────────────────
// Formato: base64(iv[12]) + ":" + base64(ciphertext+tag[16]).
// O cofre (Node) decifra com a mesma chave (CERT_VAULT_KEY), separando os
// últimos 16 bytes como authTag.

async function cifrarSenha(plain: string): Promise<string> {
  const keyBytes = base64ParaBytes(environment.appwrite.certVaultKey);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)),
  );
  return `${bytesParaBase64(iv)}:${bytesParaBase64(cipher)}`;
}

function base64ParaBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesParaBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
