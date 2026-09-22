import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-review-rank',
  template: `
    <span class="badge" [attr.data-tier]="rank()" [attr.aria-label]="'Tier ' + (rank() || 'not ranked')">
      @if (rank() === 'S') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 5 4 4-7 4 7 5-4-2 12H5L3 6Z"/><path d="M5 21h14"/></svg>
      } @else if (rank() === 'A') {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>
      }
      <small>TIER</small><strong>{{ rank() || '-' }}</strong>
    </span>`,
  styles: [`
    :host{display:inline-block}
    .badge{display:inline-flex;align-items:center;gap:.5rem;padding:.55rem .75rem;border:2px solid var(--edge,#8a9ab0);border-radius:11px;background:linear-gradient(135deg,#fff,var(--fill,#e5ebf4));color:var(--ink,#42536b);box-shadow:0 3px 0 var(--edge,#8a9ab0),0 5px 12px #20355218}
    small{font:600 .65rem Poppins,sans-serif;letter-spacing:.08em}
    strong{font:700 2.35rem/1 Poppins,sans-serif;letter-spacing:-.04em}
    svg{width:23px;height:23px;fill:currentColor;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round}
    [data-tier=S]{--ink:#754500;--edge:#c89315;--fill:#ffd665}
    [data-tier=A]{--ink:#47515f;--edge:#98a3b1;--fill:#dce2ea}
    [data-tier=B]{--ink:#80451f;--edge:#b67c50;--fill:#edc5a5}
    [data-tier=C]{--ink:#633a92;--edge:#a77ccc;--fill:#e3cbfa}
    [data-tier=D]{--ink:#943a50;--edge:#d18597;--fill:#f7ccda}
  `]
})
export class ReviewRankComponent {
  readonly tier = input('');
  readonly rank = computed(() => (this.tier() || '').trim().toUpperCase());
}
