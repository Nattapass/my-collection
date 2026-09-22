import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReviewBookService } from './review-book.service';
import { ReviewField, ReviewLibraryComponent } from '../shared/review-library.component';

@Component({
  selector: 'app-review-book',
  imports: [ReviewLibraryComponent],
  templateUrl: './review-book.component.html'
})
export class ReviewBookComponent {
  readonly service = inject(ReviewBookService);
  private readonly router = inject(Router);
  readonly fields: ReviewField[] = [
    { key: 'type', label: 'ประเภทหนังสือ', filter: true },
    { key: 'license', label: 'สำนักพิมพ์', filter: true },
    { key: 'finishedDate', label: 'อ่านจบเมื่อ' },
    { key: 'total', label: 'จำนวนเล่ม', numeric: true }
  ];
  readonly items = computed(() => this.service.reviewBooks().map((item, index) => ({
    id: String(index), name: item.name, image: item.image, tier: item.tier ?? '',
    genres: Array.isArray(item.genres) ? item.genres.filter(Boolean) : [],
    values: { type: item.type ?? '', license: item.license ?? '', finishedDate: item.finishedDate ?? '', total: item.total ?? '' }
  })));
  ngOnInit() { this.service.loadOnce(); }
  edit(id: string) {
    const item = this.service.reviewBooks()[Number(id)];
    if (!item) return;
    this.router.navigate(['/review/add-review'], {
      queryParams: { mode: 'edit', category: 'review-book', fieldName: 'name', fieldValue: item.name },
      state: { editData: item }
    });
  }
}
