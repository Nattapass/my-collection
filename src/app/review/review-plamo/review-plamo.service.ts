import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ReviewPlamo {
  image: string;
  name: string;
  line: string;
  finishedDate: string;
  assembly: number;
  design: number;
  joint: number;
  worth: number;
  score: number;
  comment: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewPlamoService {
  private readonly loaded = signal(false);
  readonly isLoading = signal(false);
  readonly reviewPlamos = signal<ReviewPlamo[]>([]);

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

  createReviewPlamo(payload: ReviewPlamo) {
    return this.http.post<ReviewPlamo>(
      'https://service-collection.vercel.app/review-plamo',
      payload
    );
  }

  updateReviewPlamoByName(name: string, payload: ReviewPlamo) {
    return this.http.put<ReviewPlamo>(
      `https://service-collection.vercel.app/review-plamo/name/${encodeURIComponent(name)}`,
      payload
    );
  }

  prependReviewPlamo(item: ReviewPlamo) {
    this.reviewPlamos.update((list) => [item, ...list]);
  }

  replaceReviewPlamoByName(name: string, item: ReviewPlamo) {
    this.reviewPlamos.update((list) => {
      const index = list.findIndex((entry) => entry.name === name);
      if (index === -1) {
        return [item, ...list];
      }
      const updated = [...list];
      updated[index] = item;
      return updated;
    });
  }

  private fetch(force = false) {
    if (!force && this.loaded()) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.http
      .get<ReviewPlamo[]>('https://service-collection.vercel.app/review-plamo')
      .subscribe({
        next: (data) => {
          this.reviewPlamos.set(data ?? []);
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
