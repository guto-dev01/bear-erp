import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Models } from 'appwrite';
import { Observable, from, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { LoginRequest, UsuarioInfo } from '@core/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USER_KEY = 'bear_user';

  private currentUser = signal<UsuarioInfo | null>(this.loadUser());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly tenantId = computed(() => this.currentUser()?.tenantId ?? '');
  readonly empresaId = computed(() => this.currentUser()?.empresaAtualId ?? '');

  constructor(private appwrite: AppwriteService, private router: Router) {}

  /**
   * Login via Appwrite Account (sessão por e-mail/senha).
   * Os metadados do app (tenant, roles, permissões) vêm das prefs do usuário.
   */
  login(request: LoginRequest): Observable<UsuarioInfo> {
    const account = this.appwrite.account;
    return from(
      // Garante que não há sessão pendente antes de criar uma nova.
      account.deleteSession('current')
        .catch(() => undefined)
        .then(() => account.createEmailPasswordSession(request.email, request.senha))
        .then(() => account.get())
    ).pipe(
      map(acc => this.toUsuarioInfo(acc)),
      tap(user => this.persist(user)),
      catchError(error => throwError(() => error))
    );
  }

  /** Revalida a sessão Appwrite (ex.: no boot ou após 401) e re-hidrata o usuário. */
  refreshToken(): Observable<UsuarioInfo> {
    return from(this.appwrite.account.get()).pipe(
      map(acc => this.toUsuarioInfo(acc)),
      tap(user => this.persist(user)),
      catchError(error => {
        this.clear();
        return throwError(() => error);
      })
    );
  }

  /** Re-hidrata silenciosamente a sessão no carregamento do app. */
  restoreSession(): Observable<UsuarioInfo | null> {
    return this.refreshToken().pipe(catchError(() => from([null as UsuarioInfo | null])));
  }

  logout(): void {
    this.appwrite.account.deleteSession('current')
      .catch(() => undefined)
      .finally(() => {
        this.clear();
        this.router.navigate(['/login']);
      });
  }

  /** O Appwrite SDK injeta a sessão nas próprias requisições; não há bearer token manual. */
  getToken(): string | null {
    return null;
  }

  hasPermission(permission: string): boolean {
    return this.currentUser()?.permissoes?.includes(permission) ?? false;
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles?.includes(role) ?? false;
  }

  private toUsuarioInfo(acc: Models.User<Models.Preferences>): UsuarioInfo {
    const prefs = (acc.prefs ?? {}) as Record<string, unknown>;
    const asArray = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
    return {
      id: acc.$id,
      nome: acc.name || (prefs['nome'] as string) || acc.email,
      email: acc.email,
      tenantId: (prefs['tenantId'] as string) ?? 'default',
      empresaAtualId: (prefs['empresaAtualId'] as string) ?? '',
      roles: asArray(prefs['roles']),
      permissoes: asArray(prefs['permissoes']),
    };
  }

  private persist(user: UsuarioInfo): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private clear(): void {
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  private loadUser(): UsuarioInfo | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
}
