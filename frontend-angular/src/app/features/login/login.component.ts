import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { animate, createTimeline, createTimer, stagger, utils } from 'animejs';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'bear-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div class="login" #root>
      <!-- Theme toggle (top-right) -->
      <button type="button" class="login__theme" (click)="theme.toggle()"
              [attr.aria-label]="theme.label()">
        <span class="material-symbols-rounded">{{ theme.icon() }}</span>
      </button>

      <!-- ═══ LEFT · brand & abstract tech composition (hidden on mobile) ═══ -->
      <aside class="login__brand" aria-hidden="true">
        <div class="login__bg">
          <div class="login__grid"></div>
          <div class="login__glow login__glow--1"></div>
          <div class="login__glow login__glow--2"></div>

          <!-- Live 3D instanced-mesh composition (mounted here when supported) -->
          <div #scene class="login__scene"></div>

          <!-- Static fallback used for reduced-motion / no-WebGL / load failure -->
          <svg class="login__network" viewBox="0 0 480 480" fill="none" preserveAspectRatio="xMidYMid slice">
            <g class="login__net-lines">
              <line x1="70" y1="90" x2="210" y2="150"/>
              <line x1="210" y1="150" x2="360" y2="80"/>
              <line x1="210" y1="150" x2="300" y2="300"/>
              <line x1="300" y1="300" x2="120" y2="360"/>
              <line x1="300" y1="300" x2="410" y2="250"/>
              <line x1="70" y1="90" x2="120" y2="360"/>
            </g>
            <g class="login__net-nodes">
              <circle cx="70" cy="90" r="4"/>
              <circle cx="210" cy="150" r="6" class="login__net-node--pulse"/>
              <circle cx="360" cy="80" r="4"/>
              <circle cx="300" cy="300" r="5" class="login__net-node--pulse"/>
              <circle cx="120" cy="360" r="4"/>
              <circle cx="410" cy="250" r="4"/>
            </g>
          </svg>
          <div class="login__scrim"></div>
        </div>

        <div class="login__brand-content">
          <div class="login__brand-top js-reveal">
            <div class="login__logo">
              @if (logoOk) {
                <img src="assets/logo-bear.png" alt="Bear ERP" (error)="logoOk = false">
              } @else {
                <span class="material-symbols-rounded">pets</span>
              }
            </div>
            <span class="login__wordmark">Bear ERP</span>
            <span class="login__pro">PRO</span>
          </div>

          <div class="login__hero">
            <h2 class="login__headline js-reveal">Gestão empresarial com inteligência e precisão.</h2>
            <p class="login__lede js-reveal">
              Centralize finanças, empresas, documentos, obrigações e operações
              em uma plataforma segura e integrada.
            </p>

            <ul class="login__features">
              <li class="login__feature js-reveal">
                <span class="login__feature-icon"><span class="material-symbols-rounded">account_balance_wallet</span></span>
                Financeiro integrado
              </li>
              <li class="login__feature js-reveal">
                <span class="login__feature-icon"><span class="material-symbols-rounded">calculate</span></span>
                Gestão contábil
              </li>
              <li class="login__feature js-reveal">
                <span class="login__feature-icon"><span class="material-symbols-rounded">verified_user</span></span>
                Dados protegidos
              </li>
            </ul>
          </div>

          <!-- Abstract floating data card (decorative) -->
          <div class="login__float js-reveal">
            <div class="login__float-head">
              <span class="login__float-dot"></span>
              <span>Empresas monitoradas</span>
            </div>
            <svg class="login__spark" viewBox="0 0 200 48" preserveAspectRatio="none" aria-hidden="true">
              <path class="login__spark-area" d="M0,40 L28,30 L56,34 L84,18 L112,24 L140,10 L168,16 L200,6 L200,48 L0,48 Z"/>
              <path class="login__spark-line" d="M0,40 L28,30 L56,34 L84,18 L112,24 L140,10 L168,16 L200,6"/>
            </svg>
          </div>

          <div class="login__brand-footer">
            <span class="material-symbols-rounded">lock</span>
            Ambiente seguro · Bear ERP
          </div>
        </div>
      </aside>

      <!-- ═══ RIGHT · form ═══ -->
      <main class="login__panel">
        <div class="login__card">
          <div class="login__mobile-brand">
            <div class="login__logo login__logo--sm">
              @if (logoOk) {
                <img src="assets/logo-bear.png" alt="Bear ERP" (error)="logoOk = false">
              } @else {
                <span class="material-symbols-rounded">pets</span>
              }
            </div>
            <span class="login__wordmark">Bear ERP</span>
            <span class="login__pro">PRO</span>
          </div>

          <header class="login__head js-reveal">
            <h1 class="login__title">Acesse sua conta</h1>
            <p class="login__subtitle">Acesse o ambiente de gestão do Bear ERP.</p>
          </header>

          @if (errorMsg()) {
            <div class="login__alert" role="alert" aria-live="assertive">
              <span class="material-symbols-rounded login__alert-icon">error</span>
              <div class="login__alert-text">
                <strong>{{ errorTitle() }}</strong>
                <span>{{ errorMsg() }}</span>
              </div>
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login__form" novalidate>
            <!-- Email -->
            <div class="login__field js-reveal">
              <label class="login__label" for="email">E-mail</label>
              <div class="login__control"
                   [class.login__control--focus]="emailFocused()"
                   [class.login__control--error]="showError('email')">
                <span class="material-symbols-rounded login__control-icon">mail</span>
                <input id="email" type="email" formControlName="email" autocomplete="email"
                       class="login__input" placeholder="voce@empresa.com.br"
                       [attr.aria-invalid]="showError('email')"
                       [attr.aria-describedby]="showError('email') ? 'email-error' : null"
                       (focus)="emailFocused.set(true)" (blur)="emailFocused.set(false)"
                       (input)="clearGeneralError()">
              </div>
              @if (showError('email')) {
                <span class="login__hint" id="email-error">
                  <span class="material-symbols-rounded">error</span>{{ emailError() }}
                </span>
              }
            </div>

            <!-- Senha -->
            <div class="login__field js-reveal">
              <label class="login__label" for="senha">Senha</label>
              <div class="login__control"
                   [class.login__control--focus]="senhaFocused()"
                   [class.login__control--error]="showError('senha')">
                <span class="material-symbols-rounded login__control-icon">lock</span>
                <input id="senha" [type]="hidePassword() ? 'password' : 'text'" formControlName="senha"
                       autocomplete="current-password" class="login__input" placeholder="••••••••"
                       [attr.aria-invalid]="showError('senha')"
                       [attr.aria-describedby]="showError('senha') ? 'senha-error' : null"
                       (focus)="senhaFocused.set(true)" (blur)="senhaFocused.set(false)"
                       (input)="clearGeneralError()">
                <button type="button" class="login__toggle" (click)="hidePassword.set(!hidePassword())"
                        [attr.aria-label]="hidePassword() ? 'Mostrar senha' : 'Ocultar senha'">
                  <span class="material-symbols-rounded">{{ hidePassword() ? 'visibility' : 'visibility_off' }}</span>
                </button>
              </div>
              @if (showError('senha')) {
                <span class="login__hint" id="senha-error">
                  <span class="material-symbols-rounded">error</span>Senha é obrigatória
                </span>
              }
            </div>

            <div class="login__row js-reveal">
              <button type="button" class="login__forgot" (click)="forgotPassword()">Esqueci minha senha</button>
            </div>

            <button type="submit" class="login__submit js-reveal" [disabled]="loading() || success()">
              @if (success()) {
                <span class="material-symbols-rounded login__submit-check">check_circle</span>
                <span>Redirecionando…</span>
              } @else if (loading()) {
                <span class="login__spinner" aria-hidden="true"></span>
                <span>Entrando…</span>
              } @else {
                <span>Entrar</span>
              }
            </button>
          </form>

          <div class="login__secure js-reveal">
            <span class="material-symbols-rounded">shield</span>
            Ambiente seguro e protegido
          </div>
        </div>
      </main>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root') root!: ElementRef<HTMLElement>;
  @ViewChild('scene') sceneRef!: ElementRef<HTMLElement>;

  loginForm: FormGroup;
  loading = signal(false);
  success = signal(false);
  /** Logo do urso; se o arquivo ainda não existir, cai para o ícone de pata. */
  logoOk = true;
  hidePassword = signal(true);
  emailFocused = signal(false);
  senhaFocused = signal(false);
  errorTitle = signal('');
  errorMsg = signal('');

  /** Respeita a preferência de redução de movimento (a11y / performance). */
  private readonly reducedMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  /** Limpeza da cena 3D (dispose de recursos WebGL + parada das animações). */
  private disposeScene: (() => void) | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private zone: NgZone,
    public theme: ThemeService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]],
    });
  }

  // ─── Animações de entrada (fora da zona do Angular, para não disparar CD) ────
  ngAfterViewInit(): void {
    if (this.reducedMotion) return; // fallback estático já é visível
    this.zone.runOutsideAngular(() => {
      this.runRevealTimeline();
      void this.initScene();
    });
  }

  ngOnDestroy(): void {
    this.disposeScene?.();
  }

  /** Revela marca + formulário com um stagger suave (anime.js). */
  private runRevealTimeline(): void {
    try {
      const host = this.root.nativeElement;
      const brand = Array.from(host.querySelectorAll<HTMLElement>('.login__brand .js-reveal'));
      const form = Array.from(host.querySelectorAll<HTMLElement>('.login__card .js-reveal'));
      const all = [...brand, ...form];
      if (!all.length) return;

      utils.set(all, { opacity: 0 }); // esconde de forma síncrona (sem flash)
      const tl = createTimeline({ defaults: { ease: 'outExpo' } });
      tl.add(brand, { opacity: [0, 1], translateY: [18, 0], duration: 700, delay: stagger(90) }, 150);
      tl.add(form, { opacity: [0, 1], translateY: [16, 0], duration: 650, delay: stagger(70) }, 350);
    } catch {
      // Se algo falhar, garante que tudo fique visível.
      this.root?.nativeElement
        .querySelectorAll<HTMLElement>('.js-reveal')
        .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    }
  }

  /**
   * Grade de cubos instanciados (Three.js) animada pelo adapter do anime.js.
   * Three.js é carregado sob demanda para não pesar o bundle inicial do login.
   */
  private async initScene(): Promise<void> {
    const container = this.sceneRef?.nativeElement;
    if (!container || typeof window === 'undefined') return;

    let THREE: typeof import('three');
    let getInstances: typeof import('animejs/adapters/three')['getInstances'];
    try {
      [THREE, { getInstances }] = await Promise.all([
        import('three'),
        import('animejs/adapters/three'),
      ]);
    } catch {
      return; // sem 3D — mantém o SVG de fallback
    }

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    if (width < 2 || height < 2) return; // painel oculto (mobile) — não monta WebGL

    let renderer: import('three').WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // WebGL indisponível — mantém o SVG de fallback
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100);
    camera.position.set(0, 0, 2.8);
    scene.add(camera);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(2, 3, 4);
    scene.add(light);

    const gridSize = 5;
    const cellSize = 2 / gridSize;
    const spread = ((gridSize - 1) / 2) * cellSize;
    const geometry = new THREE.BoxGeometry(cellSize * 0.6, cellSize * 0.6, cellSize * 0.6);
    const material = new THREE.MeshLambertMaterial();
    const mesh = new THREE.InstancedMesh(geometry, material, gridSize * gridSize * gridSize);
    scene.add(mesh);

    // Paleta on-brand (azul → ciano → branco), sem arco-íris/neon.
    const palette = ['#0a84ff', '#2c95ff', '#36a3ff', '#5ac8fa', '#a8dcff'];
    const grid: [number, number, number] = [gridSize, gridSize, gridSize];
    const gridAxis = (axis: 'x' | 'y' | 'z', span = spread) =>
      stagger([-span, span], { grid, axis });

    const instances = getInstances(mesh);

    // Rotação lenta do conjunto.
    const meshAnim = animate(mesh, {
      rotateY: 360, rotateX: 360, duration: 32000, loop: true, ease: 'linear',
    });

    // Cor + escala + espalhamento por instância, em cascata a partir do centro.
    const instAnim = animate(instances, {
      color: palette,
      x: [gridAxis('x', spread * 0.3), gridAxis('x')],
      y: [gridAxis('y', spread * 0.3), gridAxis('y')],
      z: [gridAxis('z', spread * 0.3), gridAxis('z')],
      scale: [0.1, 0.24, 0.1],
      delay: stagger([0, 2600], { grid, from: 'center', reversed: true }),
      duration: 2400, loopDelay: 500, loop: true, alternate: true, ease: 'inOutQuad',
    });

    const renderTimer = createTimer({ onUpdate: () => renderer.render(scene, camera) });

    const onResize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize, { passive: true });

    // Pausa o loop quando a aba não está visível (economia de recursos).
    const onVisibility = () => (document.hidden ? renderTimer.pause() : renderTimer.play());
    document.addEventListener('visibilitychange', onVisibility);

    // 3D pronto → esconde o fallback SVG.
    this.root?.nativeElement.classList.add('login--3d');

    this.disposeScene = () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      renderTimer.revert();
      meshAnim.revert();
      instAnim.revert();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      renderer.domElement.remove();
    };
  }

  /** Só exibe erro de campo após o usuário tocar/editar — mantém a tela calma. */
  showError(control: 'email' | 'senha'): boolean {
    const c = this.loginForm.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  emailError(): string {
    const c = this.loginForm.get('email');
    if (c?.hasError('required')) return 'E-mail é obrigatório';
    if (c?.hasError('email')) return 'E-mail inválido';
    return '';
  }

  /** Limpa o alerta geral assim que o usuário corrige algo. */
  clearGeneralError(): void {
    if (this.errorMsg()) { this.errorTitle.set(''); this.errorMsg.set(''); }
  }

  forgotPassword(): void {
    this.snackBar.open(
      'Para redefinir sua senha, entre em contato com o administrador do escritório.',
      'Entendi',
      { duration: 6000, panelClass: ['info-snackbar'] },
    );
  }

  onSubmit(): void {
    if (this.loading() || this.success()) return; // impede envios múltiplos
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.clearGeneralError();
    this.loading.set(true);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const { title, message } = this.friendlyError(err);
        this.errorTitle.set(title);
        this.errorMsg.set(message);
      },
    });
  }

  /**
   * Converte o erro bruto em uma mensagem segura para o usuário — nunca expõe
   * stack trace, resposta interna ou detalhe técnico do servidor.
   */
  private friendlyError(err: unknown): { title: string; message: string } {
    const e = err as { code?: number; type?: string; message?: string; error?: { message?: string } };
    const raw = (e?.message ?? e?.error?.message ?? '').toLowerCase();
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

    if (offline || raw.includes('failed to fetch') || raw.includes('network') || raw.includes('fetch')) {
      return { title: 'Sem conexão', message: 'Não foi possível conectar ao servidor. Verifique sua internet.' };
    }
    if (e?.code === 401 || raw.includes('invalid credentials') || raw.includes('senha') || raw.includes('password')) {
      return { title: 'Falha no acesso', message: 'E-mail ou senha inválidos.' };
    }
    if (e?.code === 429 || raw.includes('rate limit') || raw.includes('too many')) {
      return { title: 'Muitas tentativas', message: 'Aguarde um instante e tente novamente.' };
    }
    if (e?.code === 403 || raw.includes('unauthorized') || raw.includes('not authorized')) {
      return { title: 'Sem acesso', message: 'Sua conta não possui acesso a este ambiente.' };
    }
    return { title: 'Não foi possível entrar', message: 'Verifique seus dados e tente novamente.' };
  }
}
