import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReviewPlamoService } from './review-plamo.service';
import { ReviewField, ReviewLibraryComponent } from '../shared/review-library.component';

@Component({
  selector: 'app-review-plamo',
  imports: [ReviewLibraryComponent],
  templateUrl: './review-plamo.component.html'
})
export class ReviewPlamoComponent {
  readonly service = inject(ReviewPlamoService);
  private readonly router = inject(Router);
  readonly fields: ReviewField[] = [
    { key: 'line', label: 'ไลน์', filter: true },
    { key: 'finishedDate', label: 'ต่อเสร็จเมื่อ' }
  ];
  readonly items = computed(() => this.service.reviewPlamos().map((item, index) => ({
    id: String(index), name: item.name, image: item.image, tier: item.tier ?? '',
    genres: Array.isArray(item.genres) ? item.genres.filter(Boolean) : [],
    values: { line: item.line ?? '', finishedDate: item.finishedDate ?? '' }
  })));
  ngOnInit() { this.service.loadOnce(); }
  edit(id: string) {
    const item = this.service.reviewPlamos()[Number(id)];
    if (!item) return;
    this.router.navigate(['/review/add-review'], {
      queryParams: { mode: 'edit', category: 'review-plamo', fieldName: 'name', fieldValue: item.name },
      state: { editData: item }
    });
  }
}
