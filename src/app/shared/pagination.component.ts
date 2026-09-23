import { Component, computed, effect, input, model } from '@angular/core';

@Component({
  selector: 'app-pagination',
  template: `
    <nav aria-label="Pagination" class="mt-6 flex flex-wrap items-center justify-end gap-2 text-sm">
      <button type="button" [disabled]="current() <= 1" (click)="go(1)" aria-label="First page">&laquo;</button>
      <button type="button" [disabled]="current() <= 1" (click)="go(current() - 1)" aria-label="Previous page">&lsaquo;</button>
      @for (number of visible(); track number) {
        <button type="button" [attr.aria-current]="number === current() ? 'page' : null" (click)="go(number)">{{ number }}</button>
      }
      <span>{{ current() }} / {{ total() }}</span>
      <button type="button" [disabled]="current() >= total()" (click)="go(current() + 1)" aria-label="Next page">&rsaquo;</button>
      <button type="button" [disabled]="current() >= total()" (click)="go(total())" aria-label="Last page">&raquo;</button>
    </nav>
  `,
  styles: `button{min-width:2rem;padding:.35rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155}button[aria-current]{background:#285ea8;color:#fff}button:disabled{opacity:.4}button:focus-visible{outline:2px solid #285ea8;outline-offset:2px}`,
})
export class PaginationComponent {
  readonly collectionSize = input(0);
  readonly pageSize = input(20);
  readonly page = model(1);
  readonly total = computed(() => Math.max(1, Math.ceil(this.collectionSize() / Math.max(1, this.pageSize()))));
  readonly current = computed(() => Math.min(this.total(), Math.max(1, this.page())));
  readonly visible = computed(() => {
    const start = Math.max(1, Math.min(this.current() - 2, this.total() - 4));
    return Array.from({ length: Math.min(5, this.total()) }, (_, i) => start + i);
  });
  constructor() { effect(() => { if (this.page() !== this.current()) this.page.set(this.current()); }); }
  go(page: number) { this.page.set(Math.max(1, Math.min(this.total(), page))); }
}
