import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly storageKey = 'bear-sidebar-collapsed';

  readonly collapsed = signal(this.getInitialState());
  readonly width = computed(() => this.collapsed() ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)');

  toggle(): void {
    this.collapsed.update(v => !v);
    localStorage.setItem(this.storageKey, String(this.collapsed()));
  }

  private getInitialState(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }
}
