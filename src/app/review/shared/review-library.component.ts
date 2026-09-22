import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ReviewRankComponent } from './review-rank.component';
import { FloatDirective, RevealDirective } from '../../shared/motion';
import { GenreColorDirective } from '../../shared/genre-color.directive';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LibraryState, ReviewLibraryState } from './review-library-state.service';

export interface ReviewField { key: string; label: string; numeric?: boolean; filter?: boolean; }
export interface LibraryReview {
  id: string;
  name: string;
  image: string;
  tier: string;
  genres: string[];
  values: Record<string, string | number>;
}

@Component({
  selector: 'app-review-library',
  imports: [FormsModule, RouterLink, ReviewRankComponent, FloatDirective, RevealDirective, GenreColorDirective],
  templateUrl: './review-library.component.html',
  styleUrl: './review-library.component.scss'
})
export class ReviewLibraryComponent {
  readonly category = input.required<string>();
  readonly title = input.required<string>();
  readonly items = input.required<LibraryReview[]>();
  readonly fields = input.required<ReviewField[]>();
  readonly loading = input(false);
  readonly error = input(false);
  readonly refresh = output<void>();
  readonly edit = output<string>();
  private readonly memory = inject(ReviewLibraryState);
  readonly state = signal<LibraryState>(this.memory.get(''));
  readonly filterOpen = signal(false);
  readonly failedImages = signal(new Set<string>());
  readonly filterFields = computed(() => this.fields().filter(field => field.filter));
  readonly sortFields = computed(() => [
    { key: 'name', label: 'ชื่อเรื่อง' }, ...this.fields(),
    { key: 'genres', label: 'แนวเรื่อง' }, { key: 'tier', label: 'Tier' }
  ]);
  readonly activeFilters = computed(() => Object.entries(this.state().filters).filter(([, value]) => !!value));
  readonly filtered = computed(() => {
    const state = this.state();
    const query = state.search.trim().toLocaleLowerCase();
    return this.items().filter(item =>
      (!query || item.name.toLocaleLowerCase().includes(query) ||
        item.genres.some(genre => genre.toLocaleLowerCase().includes(query))) &&
      this.activeFilters().every(([key, value]) =>
        key === 'genres' ? item.genres.includes(value) : String(this.value(item, key)) === value
      )
    );
  });
  readonly sorted = computed(() => {
    const { sort, descending } = this.state();
    const result = [...this.filtered()];
    if (!sort) return result;
    const numeric = this.fields().find(field => field.key === sort)?.numeric;
    return result.sort((a, b) => {
      const left = this.value(a, sort), right = this.value(b, sort);
      let comparison: number;
      if (sort === 'tier') {
        const rank = (value: string | number) => {
          const index = ['S', 'A', 'B', 'C', 'D'].indexOf(String(value).toUpperCase());
          return index < 0 ? 99 : index;
        };
        comparison = rank(left) - rank(right);
      } else {
        comparison = numeric ? Number(left || 0) - Number(right || 0) :
          String(left).localeCompare(String(right), ['th', 'en'], { numeric: true });
      }
      return descending ? -comparison : comparison;
    });
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.state().size)));
  readonly page = computed(() => Math.min(this.state().page, this.pages()));
  readonly visible = computed(() => this.sorted().slice((this.page() - 1) * this.state().size, this.page() * this.state().size));
  readonly first = computed(() => this.sorted().length ? (this.page() - 1) * this.state().size + 1 : 0);
  readonly last = computed(() => Math.min(this.page() * this.state().size, this.sorted().length));
  private drag: { x: number; scroll: number; pointer: number } | null = null;

  constructor() {
    effect(() => this.state.set(this.memory.get(this.category())));
  }
  update(change: Partial<LibraryState>) {
    const next = { ...this.state(), ...change };
    this.state.set(next);
    this.memory.save(this.category(), next);
  }
  filter(key: string, value: string) {
    this.update({ filters: { ...this.state().filters, [key]: value }, page: 1 });
  }
  reset() { this.update({ search: '', filters: {}, page: 1 }); }
  sort(key: string) {
    this.update({ sort: key, descending: this.state().sort === key ? !this.state().descending : false, page: 1 });
  }
  options(key: string) {
    return [...new Set(this.items().flatMap(item =>
      key === 'genres' ? item.genres : [String(this.value(item, key))]
    ).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }
  value(item: LibraryReview, key: string): string | number {
    if (key === 'name') return item.name;
    if (key === 'tier') return item.tier;
    if (key === 'genres') return item.genres.join(', ');
    return item.values[key] ?? '';
  }
  label(key: string) { return this.sortFields().find(field => field.key === key)?.label ?? key; }
  imageFailed(url: string) { this.failedImages.update(urls => new Set([...urls, url])); }
  startDrag(event: PointerEvent) {
    if (event.button !== 0 || event.pointerType !== 'mouse' ||
      (event.target as Element).closest('a,button,input,select')) return;
    const target = event.currentTarget as HTMLElement;
    this.drag = { x: event.clientX, scroll: target.scrollLeft, pointer: event.pointerId };
    target.setPointerCapture(event.pointerId);
  }
  moveDrag(event: PointerEvent) {
    if (!this.drag) return;
    (event.currentTarget as HTMLElement).scrollLeft = this.drag.scroll + this.drag.x - event.clientX;
    event.preventDefault();
  }
  endDrag(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.drag = null;
  }
}
