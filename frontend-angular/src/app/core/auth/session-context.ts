/**
 * Contexto de sessão de baixo nível, SEM dependências de Angular/DI.
 *
 * O `AuthService` é o dono do registro do usuário (persistido em localStorage);
 * o `AppwriteService` precisa do `tenantId` na hora de escrever documentos
 * (para escopá-los ao Team do escritório), mas não pode injetar o `AuthService`
 * — isso criaria dependência circular (AuthService → AppwriteService). Este
 * módulo expõe a chave e um leitor puro, usados por ambos.
 */
export const SESSION_USER_KEY = 'bear_user';

interface SessaoPersistida {
  tenantId?: string;
  empresaAtualId?: string;
}

/** Lê o usuário persistido (ou null). Tolerante a JSON inválido. */
export function lerSessao(): SessaoPersistida | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    return raw ? (JSON.parse(raw) as SessaoPersistida) : null;
  } catch {
    return null;
  }
}

/** tenantId da sessão atual ('' se não autenticado). */
export function tenantIdAtual(): string {
  return lerSessao()?.tenantId ?? '';
}
