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
      switchMap(account => this.buildUsuarioInfo(account.$id, account.name, account.email)),
      tap(usuario => this.handleLoginSuccess(usuario)),
      catchError(error => throwError(() => error)),
    );
  }

  logout(): void {
    this.appwrite.deleteCurrentSession().subscribe({ next: () => {}, error: () => {} });
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /** Revalida a sessão Appwrite (ex.: no boot ou após 401) e re-hidrata o usuário. */
  refreshToken(): Observable<UsuarioInfo> {
    return this.appwrite.getAccount().pipe(
      switchMap(account => this.buildUsuarioInfo(account.$id, account.name, account.email)),
      tap(usuario => this.handleLoginSuccess(usuario)),
      catchError(error => {
        this.currentUser.set(null);
        localStorage.removeItem(this.USER_KEY);
        return throwError(() => error);
      }),
    );
  }

  /** Re-hidrata silenciosamente a sessão no carregamento do app. */
  restoreSession(): Observable<UsuarioInfo | null> {
    return this.refreshToken().pipe(catchError(() => of(null)));
  }

  getToken(): string | null {
    // Sessão é gerenciada pelo SDK do Appwrite (cookie/localStorage). Mantido por compatibilidade.
    return null;
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
