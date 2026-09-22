import { timer, switchMap } from 'rxjs';
import { ReviewMediaService } from '../shared/review-media.service';
﻿import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReviewAnime, ReviewAnimeService } from '../review-anime/review-anime.service';
import { ReviewBook, ReviewBookService } from '../review-book/review-book.service';
import { ReviewGame, ReviewGameService } from '../review-game/review-game.service';
import { ReviewPlamo, ReviewPlamoService } from '../review-plamo/review-plamo.service';
import { ReviewRankComponent } from '../shared/review-rank.component';
import { ReviewGalleryComponent, ReviewPhoto } from '../shared/review-gallery.component';
import { GenreColorDirective } from '../../shared/genre-color.directive';

type Category = 'anime' | 'book' | 'game' | 'plamo';
type Item = (ReviewAnime | ReviewBook | ReviewGame | ReviewPlamo) & { _id?: string;  };

@Component({
  selector: 'app-full-review',
  imports: [RouterLink, ReviewRankComponent, ReviewGalleryComponent, GenreColorDirective],
  templateUrl: './full-review.component.html',
  styleUrl: './full-review.component.scss'
})
export class FullReviewComponent {
  private readonly media = inject(ReviewMediaService);
  readonly photos = signal<ReviewPhoto[]>([]);
  readonly photoError = signal(false);
  readonly photoRefresh = signal(0);
  private readonly router = inject(Router);
  private readonly services = {
    anime: inject(ReviewAnimeService), book: inject(ReviewBookService),
    game: inject(ReviewGameService), plamo: inject(ReviewPlamoService)
  };
  readonly category = signal<Category>('anime');
  readonly reviewId = signal('');
  readonly coverFailed = signal(false);
  readonly categoryLabel = computed(() => ({anime:'Anime',book:'Books',game:'Games',plamo:'Plamo'})[this.category()]);
  readonly loading = computed(() => this.services[this.category()].isLoading());
  readonly error = computed(() => this.services[this.category()].loadError());
  readonly item = computed<Item | null>(() => {
    const category = this.category();
    const list: Item[] = category === 'anime' ? this.services.anime.reviewAnime() :
      category === 'book' ? this.services.book.reviewBooks() :
      category === 'game' ? this.services.game.reviewGames() : this.services.plamo.reviewPlamos();
    const id = this.reviewId();
    const direct = list.find(item => item._id === id || item.name === id);
    if (direct) return direct;
    // Support older links that encoded the name twice; preserve literal '%' names.
    try { return list.find(item => item.name === decodeURIComponent(id)) ?? null; } catch { return null; }
  });
  readonly genres = computed(() => Array.isArray(this.item()?.genres) ? this.item()!.genres.filter(Boolean) : []);
  readonly metadata = computed(() => {
    const item = this.item();
    if (!item) return [];
    switch (this.category()) {
      case 'anime': {
        const a = item as ReviewAnime;
        return [{label:'ประเภท',value:a.type},{label:'จำนวนตอน',value:a.episode},{label:'เริ่มฉาย (JP)',value:a['premiered(JP)']},{label:'ดูจบเมื่อ',value:a['finished date']}];
      }
      case 'book': {
        const b = item as ReviewBook;
        return [{label:'ประเภท',value:b.type},{label:'สำนักพิมพ์',value:b.license},{label:'จำนวนเล่ม',value:b.total},{label:'อ่านจบเมื่อ',value:b.finishedDate}];
      }
      case 'game': {
        const g = item as ReviewGame;
        return [{label:'แพลตฟอร์ม',value:g.platForm},{label:'เริ่มเล่น',value:g.startDate},{label:'เล่นจบเมื่อ',value:g.endDate}];
      }
      default: {
        const p = item as ReviewPlamo;
        return [{label:'ไลน์',value:p.line},{label:'ต่อเสร็จเมื่อ',value:p.finishedDate}];
      }
    }
  });
  constructor() {
    effect(onCleanup => {
      const gallery = this.item()?.gallery ?? [];
      const refresh = this.photoRefresh();
      untracked(() => { this.photos.set([]); this.photoError.set(false); });
      if (!gallery.length) return;
      // Renew before signed URLs expire, including when the page stays open.
      const subscription = timer(0, 50 * 60000).pipe(switchMap(tick => this.media.read(gallery, refresh > 0 || tick > 0))).subscribe({
        next: photos => { this.photos.set(photos); this.photoError.set(false); },
        error: () => this.photoError.set(true)
      });
      onCleanup(() => subscription.unsubscribe());
    });
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const type = params.get('type') ?? '';
      this.category.set(['anime','book','game','plamo'].includes(type) ? type as Category : 'anime');
      this.reviewId.set(params.get('id') ?? '');
      this.coverFailed.set(false);
      this.services[this.category()].loadOnce();
    });
  }
  refreshPhotos() { this.photoRefresh.update(value => value + 1); }
  retry() { this.services[this.category()].refresh(); }
  edit() {
    const item = this.item();
    if (item) this.router.navigate(['/review/add-review'], {
      queryParams: {mode:'edit',category:'review-' + this.category(),fieldName:'name',fieldValue:item.name},
      state: {editData:item}
    });
  }
}
