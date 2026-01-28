import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ReviewBook {
  name: string;
  type: string;
  license: string;
  total: number;
  story: number;
  character: number;
  illustration: number;
  storytelling: number;
  score: number;
  comment: string;
  image: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewBookService {
  private readonly loaded = signal(false);
  readonly isLoading = signal(false);
  readonly reviewBooks = signal<ReviewBook[]>([]);

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

  private fetch(force = false) {
    if (!force && this.loaded()) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.http
      .get<ReviewBook[]>('https://service-collection.vercel.app/review-books')
      .subscribe({
        next: (data) => {
          this.reviewBooks.set(data ?? []);
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
