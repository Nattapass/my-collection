import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReviewAnimeService } from '../review-anime/review-anime.service';
import { ReviewBookService } from '../review-book/review-book.service';
import { ReviewGameService } from '../review-game/review-game.service';
import { ReviewPlamoService } from '../review-plamo/review-plamo.service';
import { GalleryPhoto } from '../shared/review-media.service';
import { ReviewCategory } from './review-editor.config';

export interface ReviewDocument { name: string; _id?: string; type?: string; gallery?: GalleryPhoto[]; imageFolder?: string; }
interface EditorAdapter<T extends ReviewDocument = ReviewDocument> {
  cached: () => T[];
  all: () => Observable<T[]>;
  genres: () => Observable<string[]>;
  choices: () => Observable<string[]>;
  create: (payload: T) => Observable<T>;
  update: (name: string, payload: T, id: string) => Observable<T>;
  prepend: (review: T) => void;
  replace: (name: string, review: T) => void;
}
// The form emits only the fields defined by its category config. Keep the API
// adapters and existing list caches together rather than creating a second cache.
function adapter<T extends ReviewDocument>(source: EditorAdapter<T>): EditorAdapter {
  return { ...source,
    create: payload => source.create(payload as T),
    update: (name, payload, id) => source.update(name, payload as T, id),
    prepend: review => source.prepend(review as T),
    replace: (name, review) => source.replace(name, review as T),
  };
}
@Injectable({ providedIn: 'root' })
export class ReviewEditorDataService {
  private readonly anime = inject(ReviewAnimeService);
  private readonly book = inject(ReviewBookService);
  private readonly game = inject(ReviewGameService);
  private readonly plamo = inject(ReviewPlamoService);
  readonly categories: Record<ReviewCategory, EditorAdapter> = {
    'review-anime': adapter({
      cached: this.anime.reviewAnime, all: () => this.anime.getAllReviews(),
      genres: () => this.anime.getGenres(), choices: () => this.anime.getTypes(),
      create: payload => this.anime.createReviewAnime(payload), update: (name, payload, id) => this.anime.updateReviewAnimeByName(name, payload, id),
      prepend: review => this.anime.prependReviewAnime(review), replace: (name, review) => this.anime.replaceReviewAnimeByName(name, review),
    }),
    'review-book': adapter({
      cached: this.book.reviewBooks, all: () => this.book.getAllReviews(),
      genres: () => this.book.getGenres(), choices: () => this.book.getLicenses(),
      create: payload => this.book.createReviewBook(payload), update: (name, payload, id) => this.book.updateReviewBookByName(name, payload, id),
      prepend: review => this.book.prependReviewBook(review), replace: (name, review) => this.book.replaceReviewBookByName(name, review),
    }),
    'review-game': adapter({
      cached: this.game.reviewGames, all: () => this.game.getAllReviews(),
      genres: () => this.game.getGenres(), choices: () => this.game.getPlatForms(),
      create: payload => this.game.createReviewGame(payload), update: (name, payload, id) => this.game.updateReviewGameByName(name, payload, id),
      prepend: review => this.game.prependReviewGame(review), replace: (name, review) => this.game.replaceReviewGameByName(name, review),
    }),
    'review-plamo': adapter({
      cached: this.plamo.reviewPlamos, all: () => this.plamo.getAllReviews(),
      genres: () => this.plamo.getGenres(), choices: () => this.plamo.getLines(),
      create: payload => this.plamo.createReviewPlamo(payload), update: (name, payload, id) => this.plamo.updateReviewPlamoByName(name, payload, id),
      prepend: review => this.plamo.prependReviewPlamo(review), replace: (name, review) => this.plamo.replaceReviewPlamoByName(name, review),
    }),
  };
}
