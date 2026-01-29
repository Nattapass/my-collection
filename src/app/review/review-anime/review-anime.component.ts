import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { ReviewAnime, ReviewAnimeService } from './review-anime.service';

@Component({
  selector: 'app-review-anime',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbPaginationModule],
  templateUrl: './review-anime.component.html',
  styleUrl: './review-anime.component.scss'
})
export class ReviewAnimeComponent {
  private isDragging = false;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private readonly numberKeys = [
    'episode',
    'story',
    'art',
    'song',
    'character',
    'storytelling',
    'Score',
  ] as const;
  reviewAnime = this.reviewAnimeService.reviewAnime;
  isLoading = this.reviewAnimeService.isLoading;
  searchTerm = signal('');
  filterType = signal('');
  pendingType = signal('');
  isFilterOpen = signal(false);
  sortKey = signal<keyof ReviewAnime | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');
  page = 1;
  pageSize = 15;

  constructor(private reviewAnimeService: ReviewAnimeService) {}

  ngOnInit(): void {
    this.reviewAnimeService.loadOnce();
  }

  refresh() {
    this.reviewAnimeService.refresh();
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.page = 1;
  }

  openFilter() {
    this.pendingType.set(this.filterType());
    this.isFilterOpen.set(true);
  }

  closeFilter() {
    this.isFilterOpen.set(false);
  }

  applyFilter() {
    this.filterType.set(this.pendingType());
    this.page = 1;
    this.closeFilter();
  }

  clearFilter() {
    this.filterType.set('');
    this.pendingType.set('');
    this.page = 1;
  }

  setSort(key: keyof ReviewAnime) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      const defaultDir = this.numberKeys.includes(key as (typeof this.numberKeys)[number])
        ? 'desc'
        : 'asc';
      this.sortDir.set(defaultDir);
    }
    this.page = 1;
  }

  filteredAnime = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const type = this.filterType().trim().toLowerCase();
    return this.reviewAnime().filter((item) => {
      const matchesName = !term || item.name.toLowerCase().includes(term);
      const matchesType = !type || item.type.toLowerCase() === type;
      return matchesName && matchesType;
    });
  });

  sortedAnime = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    const list = [...this.filteredAnime()];
    if (!key) {
      return list;
    }
    return list.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return dir === 'desc' ? bVal - aVal : aVal - bVal;
      }
      const aStr = String(aVal ?? '').toLowerCase();
      const bStr = String(bVal ?? '').toLowerCase();
      if (aStr < bStr) {
        return dir === 'desc' ? 1 : -1;
      }
      if (aStr > bStr) {
        return dir === 'desc' ? -1 : 1;
      }
      return 0;
    });
  });

  types = computed(() => {
    const values = new Set(this.reviewAnime().map((item) => item.type).filter(Boolean));
    return Array.from(values).sort();
  });

  onDragStart(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }
    this.isDragging = true;
    this.dragStartX = event.pageX;
    this.dragStartScrollLeft = target.scrollLeft;
    target.classList.add('cursor-grabbing');
    target.setPointerCapture(event.pointerId);
  }

  onDragMove(event: PointerEvent) {
    if (!this.isDragging) {
      return;
    }
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }
    const walk = event.pageX - this.dragStartX;
    target.scrollLeft = this.dragStartScrollLeft - walk;
    event.preventDefault();
  }

  onDragEnd(event: PointerEvent) {
    if (!this.isDragging) {
      return;
    }
    const target = event.currentTarget as HTMLElement | null;
    if (target) {
      target.classList.remove('cursor-grabbing');
      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if pointer capture is already released
      }
    }
    this.isDragging = false;
  }
}
