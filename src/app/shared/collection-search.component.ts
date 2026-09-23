import { Component, computed, input, output, signal } from '@angular/core';
import { IManga } from '../manga/interface/manga.interface';

@Component({
  selector: 'app-collection-search',
  template: `
    <div class="relative">
      <input type="search" class="app-input" aria-label="Search collection" placeholder="Search collection" [value]="query()" (input)="search($any($event.target).value)" (focus)="open.set(true)" (keydown.escape)="open.set(false)" />
      @if (open() && matches().length) {
        <ul aria-label="Matching titles" class="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          @for (item of matches(); track item.no) {
            <li><button type="button" class="w-full rounded p-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50" (click)="choose(item)">{{ item.name }} ({{ item.type }})</button></li>
          }
        </ul>
      }
    </div>
  `,
})
export class CollectionSearchComponent {
  readonly items = input<IManga[]>([]);
  readonly selected = output<IManga | null>();
  readonly query = signal('');
  readonly open = signal(false);
  readonly matches = computed(() => this.query().trim() ? this.items().filter(item => item.name.toLowerCase().includes(this.query().trim().toLowerCase())).slice(0, 10) : []);
  search(value: string) { this.query.set(value); this.open.set(true); this.selected.emit(null); }
  choose(item: IManga) { this.query.set(item.name); this.open.set(false); this.selected.emit(item); }
  clear() { this.query.set(''); this.open.set(false); }
}
