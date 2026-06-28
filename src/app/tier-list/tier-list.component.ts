import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ReviewAnime, ReviewAnimeService } from '../review/review-anime/review-anime.service';
import { ReviewBook, ReviewBookService } from '../review/review-book/review-book.service';
import { ReviewGame, ReviewGameService } from '../review/review-game/review-game.service';
import { ReviewPlamo, ReviewPlamoService } from '../review/review-plamo/review-plamo.service';

type TierCategory = 'anime' | 'game' | 'book' | 'modelkit';
type TierValue = 'S' | 'A' | 'B' | 'C' | 'D';
type TierItem = {
  name: string;
  image: string;
  genres?: string[];
  tier?: string;
  type?: string;
  license?: string;
  total?: number;
  'premiered(JP)'?: string;
  'finished date'?: string;
  episode?: number;
  line?: string;
  finishedDate?: string;
  platForm?: string;
  startDate?: string;
  endDate?: string;
};

@Component({
  selector: 'app-tier-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tier-list.component.html',
  styleUrl: './tier-list.component.scss',
})
export class TierListComponent implements OnInit {
  private readonly minimumGenreItems = 5;
  readonly tiers: TierValue[] = ['S', 'A', 'B', 'C', 'D'];
  readonly categories: Array<{ key: TierCategory; label: string }> = [
    { key: 'anime', label: 'Anime' },
    { key: 'game', label: 'Game' },
    { key: 'book', label: 'Book' },
    { key: 'modelkit', label: 'Model Kit' },
  ];
  readonly selectedCategory = signal<TierCategory>('anime');
  private readonly collapsedTemplates = signal<Set<string>>(new Set());

  readonly selectedTitle = computed(() => {
    return this.categories.find((item) => item.key === this.selectedCategory())?.label ?? '';
  });

  readonly selectedItems = computed<TierItem[]>(() => {
    switch (this.selectedCategory()) {
      case 'anime':
        return this.reviewAnimeService.reviewAnime();
      case 'game':
        return this.reviewGameService.reviewGames();
      case 'book':
        return this.reviewBookService.reviewBooks();
      case 'modelkit':
        return this.reviewPlamoService.reviewPlamos();
    }
  });

  readonly genres = computed(() => {
    const values = new Map<string, number>();
    this.selectedItems().forEach((item) => {
      this.genresOf(item).forEach((genre) => {
        values.set(genre, (values.get(genre) ?? 0) + 1);
      });
    });
    return Array.from(values.entries())
      .filter(([, count]) => count >= this.minimumGenreItems)
      .map(([genre]) => genre)
      .sort();
  });

  readonly isLoading = computed(() => {
    switch (this.selectedCategory()) {
      case 'anime':
        return this.reviewAnimeService.isLoading();
      case 'game':
        return this.reviewGameService.isLoading();
      case 'book':
        return this.reviewBookService.isLoading();
      case 'modelkit':
        return this.reviewPlamoService.isLoading();
    }
  });

  constructor(
    private reviewAnimeService: ReviewAnimeService,
    private reviewBookService: ReviewBookService,
    private reviewGameService: ReviewGameService,
    private reviewPlamoService: ReviewPlamoService
  ) {}

  ngOnInit() {
    this.reviewAnimeService.loadOnce();
    this.reviewBookService.loadOnce();
    this.reviewGameService.loadOnce();
    this.reviewPlamoService.loadOnce();
  }

  selectCategory(category: TierCategory) {
    this.selectedCategory.set(category);
  }

  toggleTemplate(genre: string) {
    const key = this.templateKey(genre);
    this.collapsedTemplates.update((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isCollapsed(genre: string) {
    return this.collapsedTemplates().has(this.templateKey(genre));
  }

  itemsFor(genre: string, tier: TierValue) {
    return this.selectedItems().filter((item) => {
      return (
        String(item.tier ?? '').toUpperCase() === tier &&
        this.genresOf(item).some((itemGenre) => itemGenre === genre)
      );
    });
  }

  genreCount(genre: string) {
    return this.selectedItems().filter((item) => this.genresOf(item).includes(genre)).length;
  }

  itemDetails(item: TierItem) {
    switch (this.selectedCategory()) {
      case 'anime':
        return [
          { label: 'จำนวนตอน', value: item.episode },
          { label: 'วันฉาย', value: item['premiered(JP)'] },
          { label: 'วันที่ดูจบ', value: item['finished date'] },
          { label: 'ประเภทอนิเมะ', value: item.type },
        ].filter((detail) => detail.value !== undefined && detail.value !== null && detail.value !== '');
      case 'game':
        return [
          { label: 'แพลตฟอร์ม', value: item.platForm },
          { label: 'วันที่เริ่ม', value: item.startDate },
          { label: 'วันที่เล่นจบ', value: item.endDate },
        ].filter((detail) => detail.value !== undefined && detail.value !== null && detail.value !== '');
      case 'book':
        return [
          { label: 'ประเภทหนังสือ', value: item.type },
          { label: 'License', value: item.license },
          { label: 'จำนวนเล่ม', value: item.total },
          { label: 'วันที่อ่านจบ', value: item.finishedDate },
        ].filter((detail) => detail.value !== undefined && detail.value !== null && detail.value !== '');
      case 'modelkit':
        return [
          { label: 'ไลน์', value: item.line },
          { label: 'วันที่ต่อเสร็จ', value: item.finishedDate },
        ].filter((detail) => detail.value !== undefined && detail.value !== null && detail.value !== '');
    }
  }

  genresOf(item: TierItem | ReviewAnime | ReviewBook | ReviewGame | ReviewPlamo) {
    return Array.isArray(item.genres)
      ? item.genres.filter((genre): genre is string => typeof genre === 'string' && Boolean(genre.trim()))
      : [];
  }

  tierClass(tier: string) {
    return `tier-${String(tier || '').toLowerCase()}`;
  }

  private templateKey(genre: string) {
    return `${this.selectedCategory()}::${genre}`;
  }
}
