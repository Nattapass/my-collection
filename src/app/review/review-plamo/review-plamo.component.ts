import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { ReviewPlamo, ReviewPlamoService } from './review-plamo.service';

@Component({
  selector: 'app-review-plamo',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbPaginationModule],
  templateUrl: './review-plamo.component.html',
  styleUrl: './review-plamo.component.scss'
})
export class ReviewPlamoComponent {
  private isDragging = false;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private readonly numberKeys = ['assembly', 'design', 'joint', 'worth', 'score'] as const;
  reviewPlamos = this.reviewPlamoService.reviewPlamos;
  isLoading = this.reviewPlamoService.isLoading;
  searchTerm = signal('');
  sortKey = signal<keyof ReviewPlamo | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');
  page = 1;
  pageSize = 15;

  constructor(private reviewPlamoService: ReviewPlamoService) {}

  ngOnInit(): void {
    this.reviewPlamoService.loadOnce();
  }

  refresh() {
    this.reviewPlamoService.refresh();
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.page = 1;
  }

  setSort(key: keyof ReviewPlamo) {
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

  filteredPlamos = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.reviewPlamos().filter((item) => {
      const matchesName = !term || item.name.toLowerCase().includes(term);
      return matchesName;
    });
  });

  sortedPlamos = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    const list = [...this.filteredPlamos()];
    if (!key) {
      return list;
    }
    return list.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (key === 'finishedDate') {
        const aDate = this.toDateValue(aVal as string);
        const bDate = this.toDateValue(bVal as string);
        return dir === 'desc' ? bDate - aDate : aDate - bDate;
      }
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

  private toDateValue(value: string) {
    const parts = value?.split('/') ?? [];
    if (parts.length !== 3) {
      return 0;
    }
    const [day, month, year] = parts.map((part) => Number(part));
    if (!day || !month || !year) {
      return 0;
    }
    return new Date(year, month - 1, day).getTime();
  }

  onDragStart(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }
    const targetElement = event.target as HTMLElement | null;
    if (targetElement?.closest('button, a, input, select, textarea')) {
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
