import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Models } from 'appwrite';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { LoginRequest, UsuarioInfo } from '@core/models/auth.model';
import { SESSION_USER_KEY } from '@core/auth/session-context';

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

/**
 * Perfil guardado no `prefs` da conta Appwrite (Account service). Espelha o registro
 * da coleção `usuarios` e é a fonte CONFIÁVEL — funciona mesmo quando o serviço de
 * banco do Appwrite está fora (a coleção `usuarios` fica inacessível, o prefs não).
 */
interface UsuarioPrefs {
  nome?: string;
  tenantId?: string;
  empresaAtualId?: string;
  roles?: string[];
  permissoes?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USER_KEY = SESSION_USER_KEY;

  /** JWT do Appwrite (curta duração) para autenticar no backend Java. */
  private appwriteJwt: string | null = null;
  private jwtExpiraEm = 0;
  private jwtTimer?: ReturnType<typeof setInterval>;

  private currentUser = signal<UsuarioInfo | null>(this.loadUser());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly tenantId = computed(() => this.currentUser()?.tenantId ?? '');
  readonly empresaId = computed(() => this.currentUser()?.empresaAtualId ?? '');

  constructor(private appwrite: AppwriteService, private router: Router) {}

  login(request: LoginRequest): Observable<UsuarioInfo> {
    // Appwrite recusa criar sessão se já existe uma ativa — encerra antes.
    return this.appwrite.deleteCurrentSession().pipe(
      catchError(() => of(null)),
      switchMap(() => this.appwrite.createSession(request.email, request.senha)),
      switchMap(() => this.appwrite.getAccount()),
      switchMap(account => this.buildUsuarioInfo(account)),
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
      switchMap(account => this.buildUsuarioInfo(account)),
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

  /** Monta o perfil base a partir do `prefs` da conta Appwrite (fonte confiável). */
  private usuarioDeAccount(account: Models.User<Models.Preferences>): UsuarioInfo {
    const prefs = (account.prefs ?? {}) as UsuarioPrefs;
    return {
      id: account.$id,
      nome: prefs.nome || account.name,
      email: account.email,
      tenantId: prefs.tenantId || 'default',
      empresaAtualId: prefs.empresaAtualId ?? '',
      roles: prefs.roles ?? [],
      permissoes: prefs.permissoes ?? [],
    };
  }

  /**
   * Perfil do usuário: base vinda do `account.prefs` (Account service, sempre disponível)
   * e, quando possível, enriquecida pela coleção `usuarios`/`roles`. A consulta à coleção
   * é best-effort — se o serviço de banco do Appwrite estiver fora (500/timeout), mantém
   * o perfil do prefs, então o login funciona com papéis/permissões corretos mesmo assim.
   */
  private buildUsuarioInfo(account: Models.User<Models.Preferences>): Observable<UsuarioInfo> {
    const base = this.usuarioDeAccount(account);
    const Q = this.appwrite.query;
    return this.appwrite.listDocuments<UsuarioDoc>('usuarios', [Q.equal('email', base.email), Q.limit(1)]).pipe(
      switchMap(docs => {
        const doc = docs[0];
        if (!doc) return of(base); // sem registro de perfil — usa o do prefs
        const tenantId = doc.tenantId ?? base.tenantId;
        const roleIds = doc.roleIds ?? [];
        const rolesObs = roleIds.length
          ? this.appwrite.listDocuments<RoleDoc>('roles', [Q.equal('tenantId', tenantId)]).pipe(
              // Falha ao ler papéis não pode travar o login — cai no que o prefs já tem.
              catchError(() => of<RoleDoc[]>([])),
            )
          : of<RoleDoc[]>([]);
        return rolesObs.pipe(
          map(allRoles => {
            const myRoles = allRoles.filter(r => roleIds.includes(r.$id));
            const permissoes = Array.from(new Set(myRoles.flatMap(r => r.permissoes ?? [])));
            return {
              id: doc.$id || base.id,
              nome: doc.nome || base.nome,
              email: doc.email || base.email,
              tenantId,
              empresaAtualId: doc.empresaAtualId ?? (doc.empresaIds?.[0] ?? base.empresaAtualId),
              // Coleção sem papéis/permissões → preserva o que veio do prefs.
              roles: myRoles.length ? myRoles.map(r => r.nome) : base.roles,
              permissoes: permissoes.length ? permissoes : base.permissoes,
            } as UsuarioInfo;
          }),
        );
      }),
      // Serviço de banco fora (ex.: 500/timeout) não pode trancar o login — a sessão
      // Appwrite já foi criada e o prefs tem o perfil. Mantém o perfil base.
      catchError(() => of(base)),
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
