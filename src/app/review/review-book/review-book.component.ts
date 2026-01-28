import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { ReviewBook, ReviewBookService } from './review-book.service';

@Component({
  selector: 'app-review-book',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbPaginationModule],
  templateUrl: './review-book.component.html',
  styleUrl: './review-book.component.scss'
})
export class ReviewBookComponent {
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

  constructor(private reviewBookService: ReviewBookService) {}

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
    const values = new Set(this.reviewBooks().map((item) => item.type).filter(Boolean));
    return Array.from(values).sort();
  });

  licenses = computed(() => {
    const values = new Set(this.reviewBooks().map((item) => item.license).filter(Boolean));
    return Array.from(values).sort();
  });
}
