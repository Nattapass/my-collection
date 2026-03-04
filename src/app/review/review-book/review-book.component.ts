import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { ReviewBook, ReviewBookService } from './review-book.service';

@Component({
  selector: 'app-review-book',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbPaginationModule],
  templateUrl: './review-book.component.html',
  styleUrl: './review-book.component.scss'
})
export class ReviewBookComponent {
  private isDragging = false;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private readonly numberKeys = [
    'total',
    'story',
    'character',
    'illustration',
    'storytelling',
    'score',
  ] as const;
  reviewBooks = this.reviewBookService.reviewBooks;
  isLoading = this.reviewBookService.isLoading;
  searchTerm = signal('');
  filterType = signal('');
  filterLicense = signal('');
  pendingType = signal('');
  pendingLicense = signal('');
  isFilterOpen = signal(false);
  sortKey = signal<keyof ReviewBook | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');
  page = 1;
  pageSize = 15;

  constructor(
    private reviewBookService: ReviewBookService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.reviewBookService.loadOnce();
  }

  refresh() {
    this.reviewBookService.refresh();
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.page = 1;
  }

  openFilter() {
    this.pendingType.set(this.filterType());
    this.pendingLicense.set(this.filterLicense());
    this.isFilterOpen.set(true);
  }

  closeFilter() {
    this.isFilterOpen.set(false);
  }

  applyFilter() {
    this.filterType.set(this.pendingType());
    this.filterLicense.set(this.pendingLicense());
    this.page = 1;
    this.closeFilter();
  }

  clearFilter() {
    this.filterType.set('');
    this.filterLicense.set('');
    this.pendingType.set('');
    this.pendingLicense.set('');
    this.page = 1;
  }

  goToEdit(item: ReviewBook) {
    this.router.navigate(['/review/add-review'], {
      queryParams: {
        mode: 'edit',
        category: 'review-book',
        fieldName: 'name',
        fieldValue: item.name,
      },
      state: { editData: item },
    });
  }

  setSort(key: keyof ReviewBook) {
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

  filteredBooks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const type = this.filterType().trim().toLowerCase();
    const license = this.filterLicense().trim().toLowerCase();
    return this.reviewBooks().filter((item) => {
      const matchesName = !term || item.name.toLowerCase().includes(term);
      const matchesType = !type || item.type.toLowerCase() === type;
      const matchesLicense =
        !license || item.license.toLowerCase() === license;
      return matchesName && matchesType && matchesLicense;
    });
  });

  sortedBooks = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    const list = [...this.filteredBooks()];
    if (!key) {
      return list;
    }
    return list.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (key === 'finishedDate') {
        const aDate = this.parseDdMmYyyy(aVal);
        const bDate = this.parseDdMmYyyy(bVal);
        if (aDate !== null && bDate !== null) {
          return dir === 'desc' ? bDate - aDate : aDate - bDate;
        }
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

  private parseDdMmYyyy(value: unknown): number | null {
    if (typeof value !== 'string') {
      return null;
    }
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      return null;
    }
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date.getTime();
  }

  types = computed(() => {
    const values = new Set(this.reviewBooks().map((item) => item.type).filter(Boolean));
    return Array.from(values).sort();
  });

  licenses = computed(() => {
    const values = new Set(this.reviewBooks().map((item) => item.license).filter(Boolean));
    return Array.from(values).sort();
  });

  onDragStart(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }
    const eventTarget = event.target as Element | null;
    if (eventTarget && this.isInteractiveTarget(eventTarget)) {
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

  private isInteractiveTarget(target: Element) {
    return Boolean(
      target.closest(
        'button, a, input, select, textarea, label, [role="button"], [contenteditable="true"]'
      )
    );
  }
}
