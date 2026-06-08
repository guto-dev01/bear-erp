import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'bear-theme';

  readonly theme = signal<Theme>(this.getInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');
  readonly icon = computed(() => this.isDark() ? 'light_mode' : 'dark_mode');
  readonly label = computed(() => this.isDark() ? 'Modo claro' : 'Modo escuro');

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(this.storageKey, t);
    });
  }

  toggle(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  private getInitialTheme(): Theme {
    const stored = localStorage.getItem(this.storageKey) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    // Default to the dark Apple aesthetic (the agreed design target)
    return 'dark';
  }
}
