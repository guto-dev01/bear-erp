import { Component, Input } from '@angular/core';

/** Bloco de carregamento (shimmer). Reutilizado em todos os cards do dashboard. */
@Component({
  selector: 'bear-skeleton',
  standalone: true,
  template: `<span class="sk" [style.width]="width" [style.height]="height" [style.border-radius]="radius" aria-hidden="true"></span>`,
  styles: [`
    .sk {
      display: block;
      background: linear-gradient(100deg,
        var(--surface-2) 20%, var(--surface-3) 40%, var(--surface-2) 60%);
      background-size: 220% 100%;
      animation: skShimmer 1.4s ease-in-out infinite;
    }
    @keyframes skShimmer {
      from { background-position: 180% 0; }
      to   { background-position: -60% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sk { animation: none; }
    }
  `],
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '1rem';
  @Input() radius = '8px';
}
