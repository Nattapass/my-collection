import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReviewAnimeService } from './review-anime.service';
import { ReviewField, ReviewLibraryComponent } from '../shared/review-library.component';

@Component({
  selector: 'app-review-anime',
  imports: [ReviewLibraryComponent],
  templateUrl: './review-anime.component.html'
})
export class ReviewAnimeComponent {
  readonly service = inject(ReviewAnimeService);
  private readonly router = inject(Router);
  readonly fields: ReviewField[] = [
    { key: 'type', label: 'ประเภท', filter: true },
    { key: 'episode', label: 'จำนวนตอน', numeric: true },
    { key: 'premiered', label: 'เริ่มฉาย (JP)' },
    { key: 'finished', label: 'ดูจบเมื่อ' }
  ];
  readonly items = computed(() => this.service.reviewAnime().map((item, index) => ({
    id: String(index), name: item.name, image: item.image, tier: item.tier ?? '',
    genres: Array.isArray(item.genres) ? item.genres.filter(Boolean) : [],
    values: { type: item.type ?? '', episode: item.episode ?? '', premiered: item['premiered(JP)'] ?? '', finished: item['finished date'] ?? '' }
  })));
  ngOnInit() { this.service.loadOnce(); }
  edit(id: string) {
    const item = this.service.reviewAnime()[Number(id)];
    if (!item) return;
    this.router.navigate(['/review/add-review'], {
      queryParams: { mode: 'edit', category: 'review-anime', fieldName: 'name', fieldValue: item.name },
      state: { editData: item }
    });
  }
}
