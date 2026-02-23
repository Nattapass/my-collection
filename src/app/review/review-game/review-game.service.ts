import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ReviewGame {
  image: string;
  name: string;
  platForm: string;
  startDate: string;
  endDate: string;
  story: number;
  character: number;
  ost: number;
  gameplay: number;
  graphic: number;
  total: number;
  comment: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewGameService {
  private readonly loaded = signal(false);
  readonly isLoading = signal(false);
  readonly reviewGames = signal<ReviewGame[]>([]);

  constructor(private http: HttpClient) {}

  loadOnce() {
    if (this.loaded()) {
      return;
    }
    this.isLoading.set(true);
    this.fetch();
  }

  refresh() {
    this.fetch(true);
  }

  createReviewGame(payload: ReviewGame) {
    return this.http.post<ReviewGame>(
      'https://service-collection.vercel.app/review-game',
      payload
    );
  }

  prependReviewGame(item: ReviewGame) {
    this.reviewGames.update((list) => [item, ...list]);
  }

  private fetch(force = false) {
    if (!force && this.loaded()) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.http
      .get<ReviewGame[]>('https://service-collection.vercel.app/review-game')
      .subscribe({
        next: (data) => {
          this.reviewGames.set(data ?? []);
          this.loaded.set(true);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error(error);
        },
      });
  }
}
