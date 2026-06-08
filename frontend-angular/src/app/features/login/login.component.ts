import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'bear-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
  ],
  template: `
    <div class="login" [class.login--error-shake]="errorShake()">
      <!-- Left Panel: Branding -->
      <div class="login__brand">
        <div class="login__brand-bg">
          <div class="login__mesh-gradient"></div>
          <div class="login__dot-grid"></div>
          <div class="login__floating-shapes">
            <div class="login__shape login__shape--circle-1"></div>
            <div class="login__shape login__shape--circle-2"></div>
            <div class="login__shape login__shape--square-1"></div>
            <div class="login__shape login__shape--square-2"></div>
            <div class="login__shape login__shape--circle-3"></div>
            <div class="login__shape login__shape--square-3"></div>
          </div>
        </div>
        <div class="login__brand-content">
          <div class="login__brand-top">
            <div class="login__brand-logo animate-fade-in">
              <div class="login__brand-icon">
                <span class="material-symbols-rounded">pets</span>
              </div>
              <div class="login__brand-text">
                <h1>Bear ERP</h1>
                <span class="login__version-badge">v3.0 — Design System</span>
              </div>
            </div>
            <p class="login__brand-tagline animate-fade-in">Sistema Contábil Inteligente</p>
          </div>

          <div class="login__social-proof animate-fade-in-up">
            <div class="login__proof-badge">
              <div class="login__proof-avatars">
                <div class="login__proof-avatar">W</div>
                <div class="login__proof-avatar">M</div>
                <div class="login__proof-avatar">A</div>
                <div class="login__proof-avatar login__proof-avatar--count">+</div>
              </div>
              <span>Usado por <strong>500+</strong> escritórios contábeis</span>
            </div>
          </div>

          <div class="login__features animate-fade-in-up">
            <div class="login__feature">
              <div class="login__feature-icon-wrap">
                <span class="material-symbols-rounded login__feature-icon">speed</span>
              </div>
              <div>
                <h3>Ultra Rápido</h3>
                <p>Processamento em tempo real com cache inteligente</p>
              </div>
            </div>
            <div class="login__feature">
              <div class="login__feature-icon-wrap">
                <span class="material-symbols-rounded login__feature-icon">shield</span>
              </div>
              <div>
                <h3>100% Seguro</h3>
                <p>Criptografia AES-256 + JWT + 2FA</p>
              </div>
            </div>
            <div class="login__feature">
              <div class="login__feature-icon-wrap">
                <span class="material-symbols-rounded login__feature-icon">smart_toy</span>
              </div>
              <div>
                <h3>IA Integrada</h3>
                <p>Classificação automática contábil por Machine Learning</p>
              </div>
            </div>
          </div>

          <div class="login__brand-footer">
            <p>&copy; 2024 Bear ERP — Todos os direitos reservados</p>
            <div class="login__footer-links">
              <a href="#">Termos</a>
              <span class="login__footer-dot"></span>
              <a href="#">Privacidade</a>
              <span class="login__footer-dot"></span>
              <a href="#">Suporte</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Login Form -->
      <div class="login__form-panel">
        <div class="login__form-container animate-fade-in">
          <div class="login__form-header">
            <div class="login__mobile-logo">
              <div class="login__brand-icon login__brand-icon--small">
                <span class="material-symbols-rounded">pets</span>
              </div>
            </div>
            <h2 class="login__welcome-text">Bem-vindo ao Bear ERP</h2>
            <p class="login__subtitle">Acesse sua conta para continuar</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login__form">
            <div class="login__field">
              <div class="login__input-wrapper"
                   [class.login__input-wrapper--focus]="emailFocused()"
                   [class.login__input-wrapper--error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                   [class.login__input-wrapper--filled]="loginForm.get('email')?.value">
                <span class="material-symbols-rounded login__input-icon">mail</span>
                <input id="email" type="email" formControlName="email"
                       class="login__input" placeholder=" "
                       (focus)="emailFocused.set(true)" (blur)="emailFocused.set(false)">
                <label class="login__floating-label" for="email">Email</label>
              </div>
              @if (loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched) {
                <span class="login__error">Email é obrigatório</span>
              }
              @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
                <span class="login__error">Email inválido</span>
              }
            </div>

            <div class="login__field">
              <div class="login__input-wrapper"
                   [class.login__input-wrapper--focus]="senhaFocused()"
                   [class.login__input-wrapper--error]="loginForm.get('senha')?.invalid && loginForm.get('senha')?.touched"
                   [class.login__input-wrapper--filled]="loginForm.get('senha')?.value">
                <span class="material-symbols-rounded login__input-icon">lock</span>
                <input id="senha" [type]="hidePassword() ? 'password' : 'text'"
                       formControlName="senha" class="login__input" placeholder=" "
                       (focus)="senhaFocused.set(true)" (blur)="senhaFocused.set(false)">
                <label class="login__floating-label" for="senha">Senha</label>
                <button type="button" class="login__input-toggle" (click)="hidePassword.set(!hidePassword())">
                  <span class="material-symbols-rounded">
                    {{ hidePassword() ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
              @if (loginForm.get('senha')?.hasError('required') && loginForm.get('senha')?.touched) {
                <span class="login__error">Senha é obrigatória</span>
              }
              @if (loginForm.get('senha')?.value) {
                <div class="login__password-strength">
                  <div class="login__strength-bars">
                    <div class="login__strength-bar" [class.login__strength-bar--active]="passwordStrength() >= 1"></div>
                    <div class="login__strength-bar" [class.login__strength-bar--active]="passwordStrength() >= 2"></div>
                    <div class="login__strength-bar" [class.login__strength-bar--active]="passwordStrength() >= 3"></div>
                    <div class="login__strength-bar" [class.login__strength-bar--active]="passwordStrength() >= 4"></div>
                  </div>
                  <span class="login__strength-text">{{ passwordStrengthLabel() }}</span>
                </div>
              }
            </div>

            <div class="login__options">
              <label class="login__remember">
                <input type="checkbox" class="login__checkbox">
                <span class="login__checkmark"></span>
                <span>Lembrar de mim</span>
              </label>
              <a class="login__forgot">Esqueci a senha</a>
            </div>

            <button type="submit" class="login__submit" [disabled]="loginForm.invalid || loading()"
                    [class.login__submit--loading]="loading()">
              @if (loading()) {
                <div class="login__spinner"></div>
                <span>Entrando...</span>
              } @else {
                <span>Entrar</span>
                <span class="material-symbols-rounded login__submit-arrow">arrow_forward</span>
              }
            </button>
          </form>

          <div class="login__divider">
            <span>ou continue com</span>
          </div>

          <div class="login__social-buttons">
            <button class="login__social login__social--cert" type="button">
              <span class="material-symbols-rounded">fingerprint</span>
              <span>Entrar com Certificado Digital</span>
            </button>
            <button class="login__social login__social--google" type="button">
              <svg class="login__google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Entrar com Google</span>
            </button>
          </div>

          <p class="login__signup">
            Primeiro acesso? <a class="login__signup-link">Criar conta</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = signal(false);
  hidePassword = signal(true);
  emailFocused = signal(false);
  senhaFocused = signal(false);
  errorShake = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]],
    });
  }

  passwordStrength(): number {
    const val = this.loginForm.get('senha')?.value || '';
    let score = 0;
    if (val.length >= 4) score++;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val) && /[^a-zA-Z0-9]/.test(val)) score++;
    return score;
  }

  passwordStrengthLabel(): string {
    const s = this.passwordStrength();
    if (s <= 1) return 'Fraca';
    if (s === 2) return 'Razoável';
    if (s === 3) return 'Boa';
    return 'Forte';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.loading.set(true);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorShake.set(true);
        setTimeout(() => this.errorShake.set(false), 600);
        const message = err?.message ?? err.error?.message ?? 'Erro ao realizar login';
        this.snackBar.open(message, 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
