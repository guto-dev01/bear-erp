import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { LoginRequest, UsuarioInfo } from '@core/models/auth.model';

interface UsuarioDoc {
  $id: string;
  nome: string;
  email: string;
  tenantId?: string;
  empresaAtualId?: string;
  empresaIds?: string[];
  roleIds?: string[];
  status?: string;
}

interface RoleDoc {
  $id: string;
  nome: string;
  permissoes?: string[];
  tenantId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USER_KEY = 'bear_user';

  /** JWT do Appwrite (curta duração) para autenticar no backend Java. */
  private appwriteJwt: string | null = null;
  private jwtExpiraEm = 0;
  private jwtTimer?: ReturnType<typeof setInterval>;

  private currentUser = signal<UsuarioInfo | null>(this.loadUser());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly tenantId = computed(() => this.currentUser()?.tenantId ?? '');
  readonly empresaId = computed(() => this.currentUser()?.empresaAtualId ?? '');
  readonly empresaIds = computed(() => this.currentUser()?.empresaIds ?? []);

  constructor(private appwrite: AppwriteService, private router: Router) {}

  login(request: LoginRequest): Observable<UsuarioInfo> {
    // Appwrite recusa criar sessão se já existe uma ativa — encerra antes.
    return this.appwrite.deleteCurrentSession().pipe(
      catchError(() => of(null)),
      switchMap(() => this.appwrite.createSession(request.email, request.senha)),
      switchMap(() => this.appwrite.getAccount()),
      switchMap(account => this.buildUsuarioInfo(account.$id, account.name, account.email)),
      switchMap(usuario => this.iniciarJwt().pipe(map(() => usuario), catchError(() => of(usuario)))),
      tap(usuario => this.handleLoginSuccess(usuario)),
      catchError(error => throwError(() => error)),
    );
  }

  logout(): void {
    this.appwrite.deleteCurrentSession().subscribe({ next: () => {}, error: () => {} });
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.limparJwt();
    this.router.navigate(['/login']);
  }

  /** Revalida a sessão Appwrite (ex.: no boot ou após 401) e re-hidrata o usuário. */
  refreshToken(): Observable<UsuarioInfo> {
    return this.appwrite.getAccount().pipe(
      switchMap(account => this.buildUsuarioInfo(account.$id, account.name, account.email)),
      switchMap(usuario => this.iniciarJwt().pipe(map(() => usuario), catchError(() => of(usuario)))),
      tap(usuario => this.handleLoginSuccess(usuario)),
      catchError(error => {
        this.currentUser.set(null);
        localStorage.removeItem(this.USER_KEY);
        this.limparJwt();
        return throwError(() => error);
      }),
    );
  }

  /** Re-hidrata silenciosamente a sessão no carregamento do app. */
  restoreSession(): Observable<UsuarioInfo | null> {
    return this.refreshToken().pipe(catchError(() => of(null)));
  }

  /** Troca a empresa ativa: atualiza a sessão, persiste localmente e no perfil do usuário. */
  setEmpresaAtual(empresaId: string): void {
    const u = this.currentUser();
    if (!u || u.empresaAtualId === empresaId) return;
    const novo: UsuarioInfo = { ...u, empresaAtualId: empresaId };
    this.currentUser.set(novo);
    localStorage.setItem(this.USER_KEY, JSON.stringify(novo));
    // Persiste no perfil para sobreviver a recarregamentos (best-effort).
    this.appwrite.updateDocument('usuarios', u.id, { empresaAtualId: empresaId })
      .subscribe({ next: () => {}, error: () => {} });
  }

  getToken(): string | null {
    // JWT do Appwrite para o backend Java. O interceptor o envia como Bearer.
    return Date.now() < this.jwtExpiraEm ? this.appwriteJwt : null;
  }

  /** Gera o primeiro JWT e agenda renovações proativas (o JWT do Appwrite vive ~15 min). */
  private iniciarJwt(): Observable<string> {
    return this.renovarJwt().pipe(tap(() => this.agendarRenovacaoJwt()));
  }

  private renovarJwt(): Observable<string> {
    return this.appwrite.createJwt().pipe(
      tap(jwt => {
        this.appwriteJwt = jwt;
        this.jwtExpiraEm = Date.now() + 13 * 60 * 1000; // renova antes dos 15 min
      }),
    );
  }

  private agendarRenovacaoJwt(): void {
    if (this.jwtTimer) return;
    this.jwtTimer = setInterval(() => {
      this.renovarJwt().subscribe({ error: () => {} });
    }, 13 * 60 * 1000);
  }

  private limparJwt(): void {
    this.appwriteJwt = null;
    this.jwtExpiraEm = 0;
    if (this.jwtTimer) {
      clearInterval(this.jwtTimer);
      this.jwtTimer = undefined;
    }
  }

  hasPermission(permission: string): boolean {
    return this.currentUser()?.permissoes?.includes(permission) ?? false;
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles?.includes(role) ?? false;
  }

  /** Enriquece os dados da conta Appwrite com tenant/roles/permissões da coleção `usuarios`. */
  private buildUsuarioInfo(accountId: string, nome: string, email: string): Observable<UsuarioInfo> {
    const Q = this.appwrite.query;
    return this.appwrite.listDocuments<UsuarioDoc>('usuarios', [Q.equal('email', email), Q.limit(1)]).pipe(
      switchMap(docs => {
        const doc = docs[0];
        if (!doc) {
          // Conta existe no Appwrite Auth mas sem registro de perfil — usa defaults.
          return of<UsuarioInfo>({
            id: accountId, nome, email, tenantId: 'default',
            empresaAtualId: '', roles: [], permissoes: [],
          });
        }
        const tenantId = doc.tenantId ?? 'default';
        const roleIds = doc.roleIds ?? [];
        const rolesObs = roleIds.length
          ? this.appwrite.listDocuments<RoleDoc>('roles', [Q.equal('tenantId', tenantId)])
          : of<RoleDoc[]>([]);
        return rolesObs.pipe(
          map(allRoles => {
            const myRoles = allRoles.filter(r => roleIds.includes(r.$id));
            const permissoes = Array.from(new Set(myRoles.flatMap(r => r.permissoes ?? [])));
            return {
              id: doc.$id || accountId,
              nome: doc.nome || nome,
              email: doc.email || email,
              tenantId,
              empresaAtualId: doc.empresaAtualId ?? (doc.empresaIds?.[0] ?? ''),
              empresaIds: doc.empresaIds ?? [],
              roles: myRoles.map(r => r.nome),
              permissoes,
            } as UsuarioInfo;
          }),
        );
      }),
    );
  }

  private handleLoginSuccess(usuario: UsuarioInfo): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
    this.currentUser.set(usuario);
  }

  private loadUser(): UsuarioInfo | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
}
