import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ReviewAnime {
  name: string;
  'premiered(JP)': string;
  image: string;
  'finished date': string;
  type: string;
  episode: number;
  story: number;
  art: number;
  song: number;
  character: number;
  storytelling: number;
  Score: number;
  comment: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewAnimeService {
  private readonly loaded = signal(false);
  readonly isLoading = signal(false);
  readonly reviewAnime = signal<ReviewAnime[]>([]);

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

  createReviewAnime(payload: ReviewAnime) {
    return this.http.post<ReviewAnime>(
      'https://service-collection.vercel.app/review-anime',
      payload
    );
  }

  prependReviewAnime(item: ReviewAnime) {
    this.reviewAnime.update((list) => [item, ...list]);
  }

  private fetch(force = false) {
    if (!force && this.loaded()) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.http
      .get<ReviewAnime[]>('https://service-collection.vercel.app/review-anime')
      .subscribe({
        next: (data) => {
          this.reviewAnime.set(data ?? []);
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
