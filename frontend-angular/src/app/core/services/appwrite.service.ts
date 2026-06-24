import { Injectable } from '@angular/core';
import { Account, Client, Databases, Functions, ID, Models, Permission, Query, Role, Storage } from 'appwrite';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AppwriteService {
  private client: Client;
  private databases: Databases;
  private account_: Account;
  private functions: Functions;
  private storage: Storage;
  private readonly dbId = environment.appwrite.databaseId;

  constructor() {
    this.client = new Client()
      .setEndpoint(environment.appwrite.endpoint)
      .setProject(environment.appwrite.projectId);
    this.databases = new Databases(this.client);
    this.account_ = new Account(this.client);
    this.functions = new Functions(this.client);
    this.storage = new Storage(this.client);
  }

  /** Account API do Appwrite (autenticação por sessão). */
  get account(): Account {
    return this.account_;
  }

  // ── Database ────────────────────────────────────────────────
  listDocuments<T>(collectionId: string, queries: string[] = []): Observable<T[]> {
    return from(this.databases.listDocuments(this.dbId, collectionId, queries)).pipe(
      map(res => res.documents as T[])
    );
  }

  getDocument<T>(collectionId: string, documentId: string): Observable<T> {
    return from(this.databases.getDocument(this.dbId, collectionId, documentId)) as Observable<T>;
  }

  createDocument<T>(collectionId: string, data: Record<string, unknown>, documentId?: string): Observable<T> {
    return from(this.databases.createDocument(this.dbId, collectionId, documentId || ID.unique(), data)) as Observable<T>;
  }

  updateDocument<T>(collectionId: string, documentId: string, data: Record<string, unknown>): Observable<T> {
    return from(this.databases.updateDocument(this.dbId, collectionId, documentId, data)) as Observable<T>;
  }

  deleteDocument(collectionId: string, documentId: string): Observable<unknown> {
    return from(this.databases.deleteDocument(this.dbId, collectionId, documentId));
  }

  // ── Auth (Appwrite Account) ─────────────────────────────────
  createSession(email: string, password: string): Observable<Models.Session> {
    return from(this.account_.createEmailPasswordSession(email, password));
  }

  getAccount(): Observable<Models.User<Models.Preferences>> {
    return from(this.account_.get());
  }

  /**
   * Gera um JWT de curta duração (~15 min) da sessão Appwrite atual, para
   * autenticar requisições ao backend Java (gateway valida via Appwrite).
   */
  createJwt(): Observable<string> {
    return from(this.account_.createJWT()).pipe(map(res => res.jwt));
  }

  deleteCurrentSession(): Observable<unknown> {
    return from(this.account_.deleteSession('current'));
  }

  createAccount(email: string, password: string, name: string): Observable<Models.User<Models.Preferences>> {
    return from(this.account_.create(ID.unique(), email, password, name));
  }

  // ── Storage (Appwrite) ──────────────────────────────────────
  /**
   * Envia um arquivo a um bucket. Por padrão restringe o acesso ao próprio
   * usuário (read/update/delete só do dono); a API key do servidor — usada
   * pelo cofre nas Functions — lê independentemente das permissões.
   */
  createFile(bucketId: string, file: File, userId?: string): Observable<Models.File> {
    const perms = userId
      ? [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))]
      : undefined;
    return from(this.storage.createFile(bucketId, ID.unique(), file, perms));
  }

  deleteFile(bucketId: string, fileId: string): Observable<unknown> {
    return from(this.storage.deleteFile(bucketId, fileId));
  }

  // ── Functions (Appwrite) ────────────────────────────────────
  /**
   * Executa uma Appwrite Function de forma síncrona e devolve o corpo da
   * resposta já parseado como JSON. O segredo (ex.: token do Hub) fica na
   * Function — o navegador só envia o payload.
   */
  executeFunction<T>(functionId: string, payload: Record<string, unknown> = {}): Observable<T> {
    return from(this.functions.createExecution(functionId, JSON.stringify(payload))).pipe(
      map(exec => JSON.parse(exec.responseBody || '{}') as T)
    );
  }

  query = Query;
}
