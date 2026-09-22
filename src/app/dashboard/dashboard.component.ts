import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, effect, inject, NgZone, PLATFORM_ID, signal } from '@angular/core';
import { FloatDirective } from '../shared/motion';
import { ReviewRankComponent } from '../review/shared/review-rank.component';
import { GenreColorDirective } from '../shared/genre-color.directive';
import { RouterLink } from '@angular/router';
import { ReviewAnimeService } from '../review/review-anime/review-anime.service';
import { ReviewBookService } from '../review/review-book/review-book.service';
import { ReviewGameService } from '../review/review-game/review-game.service';
import { ReviewPlamoService } from '../review/review-plamo/review-plamo.service';

interface FeaturedReview { name: string; image: string; tier: string; genres: string[]; }

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, FloatDirective, ReviewRankComponent, GenreColorDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly anime = inject(ReviewAnimeService);
  private readonly books = inject(ReviewBookService);
  private readonly games = inject(ReviewGameService);
  private readonly plamo = inject(ReviewPlamoService);
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  readonly groups = [
    { key: 'anime', label: 'Anime', items: this.anime.reviewAnime, loading: this.anime.isLoading, error: this.anime.loadError, retry: () => this.anime.refresh() },
    { key: 'game', label: 'Games', items: this.games.reviewGames, loading: this.games.isLoading, error: this.games.loadError, retry: () => this.games.refresh() },
    { key: 'book', label: 'Books', items: this.books.reviewBooks, loading: this.books.isLoading, error: this.books.loadError, retry: () => this.books.refresh() },
    { key: 'plamo', label: 'Plamo', items: this.plamo.reviewPlamos, loading: this.plamo.isLoading, error: this.plamo.loadError, retry: () => this.plamo.refresh() }
  ];
  readonly selected = signal<(FeaturedReview | null)[]>([null, null, null, null]);
  readonly paused = signal(false);
  readonly failedImages = signal<Set<string>>(new Set());
  hovered = false;
  focused = false;
  private readonly remaining: FeaturedReview[][] = [[], [], [], []];
  private cursor = 0;

  constructor() {
    this.groups.forEach((group, index) => effect(() => {
      this.remaining[index] = this.shuffle(group.items());
      const first = this.remaining[index].pop() ?? null;
      this.selected.update(current => current.map((item, i) => i === index ? first : item));
    }));
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.anime.loadOnce();
      this.games.loadOnce();
      this.books.loadOnce();
      this.plamo.loadOnce();
      const media = this.document.defaultView!.matchMedia('(prefers-reduced-motion: reduce)');
      this.paused.set(media.matches);
      const onMotionChange = () => { if (media.matches) this.paused.set(true); };
      media.addEventListener('change', onMotionChange);
      // Do not keep Angular unstable with a permanent rotation timer.
      this.zone.runOutsideAngular(() => {
        const timer = setInterval(() => {
          if (this.paused() || this.hovered || this.focused || this.document.hidden) return;
          for (let offset = 0; offset < this.groups.length; offset++) {
            const index = (this.cursor + offset) % this.groups.length;
            if (this.groups[index].items().length > 1) {
              this.zone.run(() => this.next(index));
              this.cursor = (index + 1) % this.groups.length;
              break;
            }
          }
        }, 8000);
        this.destroyRef.onDestroy(() => {
          clearInterval(timer);
          media.removeEventListener('change', onMotionChange);
        });
      });
    }
  }

  next(index: number) {
    const items: FeaturedReview[] = this.groups[index].items();
    if (items.length < 2) return;
    if (!this.remaining[index].length) {
      const bag = this.shuffle(items);
      if (bag[bag.length - 1] === this.selected()[index]) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      this.remaining[index] = bag;
    }
    const next = this.remaining[index].pop()!;
    this.selected.update(current => current.map((item, i) => i === index ? next : item));
  }

  imageFailed(url: string) {
    this.failedImages.update(current => new Set([...current, url]));
  }

  genres(item: FeaturedReview) {
    return Array.isArray(item.genres) ? item.genres.filter(Boolean).slice(0, 3) : [];
  }

  categoryIcon(key: string): string {
    const icons: Record<string, string> = {
      anime: 'M4 6h16v13H4zM8 2l4 4 4-4M9 10l6 3-6 3z',
      game: 'M7 7h10c3 0 5 11 2 12-2 1-4-3-4-3H9s-2 4-4 3C2 18 4 7 7 7zM6 11h4M8 9v4M15 11h.01M18 13h.01',
      book: 'M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1zM12 5v15',
      plamo: 'M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M8 4l9 5'
    };
    return icons[key] ?? icons['book'];
  }

  private shuffle(items: FeaturedReview[]) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
