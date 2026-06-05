import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class PwaService {
  private swUpdate = inject(SwUpdate);
  private snackBar = inject(MatSnackBar);

  private deferredPrompt: any;

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        const ref = this.snackBar.open(
          'Nova versão disponível! Atualize para obter as últimas melhorias.',
          'Atualizar',
          { duration: 10000 }
        );
        ref.onAction().subscribe(() => {
          window.location.reload();
        });
      });

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    return result.outcome === 'accepted';
  }

  get canInstall(): boolean {
    return !!this.deferredPrompt;
  }

  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) return false;
    return this.swUpdate.checkForUpdate();
  }
}
