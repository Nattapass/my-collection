import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReviewGameService } from './review-game.service';
import { ReviewField, ReviewLibraryComponent } from '../shared/review-library.component';

@Component({
  selector: 'app-review-game',
  imports: [ReviewLibraryComponent],
  templateUrl: './review-game.component.html'
})
export class ReviewGameComponent {
  readonly service = inject(ReviewGameService);
  private readonly router = inject(Router);
  readonly fields: ReviewField[] = [
    { key: 'platForm', label: 'แพลตฟอร์ม', filter: true },
    { key: 'startDate', label: 'วันที่เริ่ม' },
    { key: 'endDate', label: 'เล่นจบเมื่อ' }
  ];
  readonly items = computed(() => this.service.reviewGames().map((item, index) => ({
    id: String(index), name: item.name, image: item.image, tier: item.tier ?? '',
    genres: Array.isArray(item.genres) ? item.genres.filter(Boolean) : [],
    values: { platForm: item.platForm ?? '', startDate: item.startDate ?? '', endDate: item.endDate ?? '' }
  })));
  ngOnInit() { this.service.loadOnce(); }
  edit(id: string) {
    const item = this.service.reviewGames()[Number(id)];
    if (!item) return;
    this.router.navigate(['/review/add-review'], {
      queryParams: { mode: 'edit', category: 'review-game', fieldName: 'name', fieldValue: item.name },
      state: { editData: item }
    });
  }
}
