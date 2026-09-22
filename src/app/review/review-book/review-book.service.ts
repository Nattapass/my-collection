import { GalleryPhoto } from '../shared/review-media.service';
import { API_URL } from '../../shared/api-url';
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ReviewBook {
  name: string;
  _id?: string;
  gallery?: GalleryPhoto[];
  imageFolder?: string;
  type: string;
  license: string;
  genres: string[];
  tier: string;
  finishedDate: string;
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
  readonly loadError = signal(false);
  readonly reviewBooks = signal<ReviewBook[]>([]);

  constructor(private http: HttpClient) {}

  loadOnce() {
    if (this.loaded() || this.isLoading()) {
      return;
    }
    this.fetch();
  }

  refresh() {
    this.fetch(true);
  }

  createReviewBook(payload: ReviewBook) {
    return this.http.post<ReviewBook>(
      `${API_URL}/review-books`,
      payload
    );
  }

  getAllReviews() {
    return this.http.get<ReviewBook[]>(`${API_URL}/review-books`);
  }

  updateReviewBookByName(name: string, payload: ReviewBook, id = '') {
    return this.http.put<ReviewBook>(
      `${API_URL}/review-books/${id ? '_id' : 'name'}/${encodeURIComponent(id || name)}`,
      payload
    );
  }

  getLicenses() {
    return this.http.get<string[]>(
      `${API_URL}/review-books/license`
    );
  }

  getGenres() {
    return this.http.get<string[]>(
      `${API_URL}/review-books/genres`
    );
  }

  prependReviewBook(item: ReviewBook) {
    this.reviewBooks.update((list) => [item, ...list]);
  }

  replaceReviewBookByName(name: string, item: ReviewBook) {
    this.reviewBooks.update((list) => {
      const index = list.findIndex((entry) => item._id ? entry._id === item._id : entry.name === name);
      if (index === -1) {
        return [item, ...list];
      }
      const updated = [...list];
      updated[index] = item;
      return updated;
    });
  }

  private fetch(force = false) {
    if (this.isLoading()) return;
    if (!force && this.loaded()) {
      this.isLoading.set(false);
      return;
    }
    this.loadError.set(false);
    this.isLoading.set(true);
    this.http
      .get<ReviewBook[]>(`${API_URL}/review-books`)
      .subscribe({
        next: (data) => {
          this.reviewBooks.set(data ?? []);
          this.loaded.set(true);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.loadError.set(true);
          this.isLoading.set(false);
          console.error(error);
        },
      });
  }
}
