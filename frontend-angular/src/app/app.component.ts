import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'bear-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {
  private auth = inject(AuthService);

  constructor() {
    // Revalida a sessão Appwrite no carregamento (atualiza prefs / expira se inválida).
    this.auth.restoreSession().subscribe();
  }
}
