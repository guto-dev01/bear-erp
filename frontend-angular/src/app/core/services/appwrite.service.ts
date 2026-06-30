import { Injectable } from '@angular/core';
import { Account, Client, Databases, Functions, ID, Models, Permission, Query, Role, Teams } from 'appwrite';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { tenantIdAtual } from '@core/auth/session-context';

@Injectable({ providedIn: 'root' })
export class AppwriteService {
  private client: Client;
  private databases: Databases;
  private account_: Account;
  private functions: Functions;
  private teams_: Teams;
  private readonly dbId = environment.appwrite.databaseId;

  constructor() {
    this.client = new Client()
      .setEndpoint(environment.appwrite.endpoint)
      .setProject(environment.appwrite.projectId);
    this.databases = new Databases(this.client);
    this.account_ = new Account(this.client);
    this.functions = new Functions(this.client);
    this.teams_ = new Teams(this.client);
  }

  /** Account API do Appwrite (autenticação por sessão). */
  get account(): Account {
    return this.account_;
  }

  /** Teams API (escritórios = Teams; isolamento multi-tenant). */
  get teams(): Teams {
    return this.teams_;
  }

  /**
   * Permissões de documento escopadas a um Team (escritório). read/update/delete
   * só para membros do Team; `create` fica na coleção. É o núcleo do isolamento
   * multi-tenant — todo documento nasce restrito ao seu escritório.
   */
  permissoesTenant(tenantId: string): string[] {
    return [
      Permission.read(Role.team(tenantId)),
      Permission.update(Role.team(tenantId)),
      Permission.delete(Role.team(tenantId)),
    ];
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

  /**
   * Cria um documento JÁ ESCOPADO ao escritório (Team). Por padrão usa o tenant
   * da sessão atual — toda escrita herda a permissão do tenant automaticamente,
   * sem repetir em cada feature. Para casos como o onboarding (gravar no Team
   * recém-criado, diferente do tenant da sessão), passe `permissions` explícito.
   */
  createDocument<T>(
    collectionId: string,
    data: Record<string, unknown>,
    documentId?: string,
    permissions?: string[],
  ): Observable<T> {
    const perms = permissions ?? this.permissoesDaSessao();
    return from(
      this.databases.createDocument(this.dbId, collectionId, documentId || ID.unique(), data, perms),
    ) as Observable<T>;
  }

  /** Permissões do tenant da sessão (ou `undefined` se ainda não autenticado). */
  private permissoesDaSessao(): string[] | undefined {
    const tenantId = tenantIdAtual();
    return tenantId ? this.permissoesTenant(tenantId) : undefined;
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

  // ── Teams (escritórios) ─────────────────────────────────────
  /**
   * Cria o Team do escritório (id === tenantId). O usuário atual entra
   * automaticamente como OWNER (regra do Appwrite na criação de Team).
   */
  criarEscritorioTeam(tenantId: string, nome: string): Observable<Models.Team<Models.Preferences>> {
    return from(this.teams_.create(tenantId, nome));
  }

  /**
   * Convida um colaborador para o escritório com a role do app
   * (ADMIN/CONTADOR/AUXILIAR). O convite é confirmado pelo link enviado a `url`.
   */
  convidarMembro(tenantId: string, email: string, roles: string[], url: string): Observable<Models.Membership> {
    return from(this.teams_.createMembership(tenantId, roles, email, undefined, undefined, url));
  }

  listarMembros(tenantId: string): Observable<Models.Membership[]> {
    return from(this.teams_.listMemberships(tenantId)).pipe(map(r => r.memberships));
  }

  query = Query;
}
