import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReviewAnime, ReviewAnimeService } from '../review-anime/review-anime.service';
import { ReviewBook, ReviewBookService } from '../review-book/review-book.service';
import { ReviewGame, ReviewGameService } from '../review-game/review-game.service';
import { ReviewPlamo, ReviewPlamoService } from '../review-plamo/review-plamo.service';

type ReviewCategory = 'anime' | 'book' | 'game' | 'plamo';
type ReviewItem = ReviewAnime | ReviewBook | ReviewGame | ReviewPlamo;

@Component({
  selector: 'app-full-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './full-review.component.html',
  styleUrl: './full-review.component.scss'
})
export class FullReviewComponent {
  readonly category = signal<ReviewCategory>('anime');
  readonly reviewId = signal('');
  readonly item = signal<ReviewItem | null>(null);
  readonly animeItem = computed(() => (this.category() === 'anime' ? (this.item() as ReviewAnime | null) : null));
  readonly bookItem = computed(() => (this.category() === 'book' ? (this.item() as ReviewBook | null) : null));
  readonly gameItem = computed(() => (this.category() === 'game' ? (this.item() as ReviewGame | null) : null));
  readonly plamoItem = computed(() => (this.category() === 'plamo' ? (this.item() as ReviewPlamo | null) : null));

  readonly categoryLabel = computed(() => {
    const category = this.category();
    switch (category) {
      case 'anime':
        return 'Anime';
      case 'book':
        return 'Book';
      case 'game':
        return 'Game';
      case 'plamo':
        return 'Plamo';
      default:
        return 'Review';
    }
  });

  constructor(
    private route: ActivatedRoute,
    private reviewAnimeService: ReviewAnimeService,
    private reviewBookService: ReviewBookService,
    private reviewGameService: ReviewGameService,
    private reviewPlamoService: ReviewPlamoService
  ) {}

  ngOnInit(): void {
    this.reviewAnimeService.loadOnce();
    this.reviewBookService.loadOnce();
    this.reviewGameService.loadOnce();
    this.reviewPlamoService.loadOnce();

    this.route.paramMap.subscribe((params) => {
      const rawType = (params.get('type') ?? '').toLowerCase();
      const rawId = decodeURIComponent(params.get('id') ?? '');
      const category = this.normalizeCategory(rawType);

      this.category.set(category);
      this.reviewId.set(rawId);
      this.item.set(this.findItem(category, rawId));
    });
  }

  genresOf(item: ReviewItem): string[] {
    return Array.isArray((item as { genres?: string[] }).genres)
      ? ((item as { genres?: string[] }).genres ?? []).filter(Boolean)
      : [];
  }

  private normalizeCategory(type: string): ReviewCategory {
    switch (type) {
      case 'book':
        return 'book';
      case 'game':
        return 'game';
      case 'plamo':
        return 'plamo';
      case 'anime':
      default:
        return 'anime';
    }
  }

  private findItem(category: ReviewCategory, id: string): ReviewItem | null {
    switch (category) {
      case 'book':
        return this.reviewBookService.reviewBooks().find((item) => item.name === id) ?? null;
      case 'game':
        return this.reviewGameService.reviewGames().find((item) => item.name === id) ?? null;
      case 'plamo':
        return this.reviewPlamoService.reviewPlamos().find((item) => item.name === id) ?? null;
      case 'anime':
      default:
        return this.reviewAnimeService.reviewAnime().find((item) => item.name === id) ?? null;
    }
  }
}
