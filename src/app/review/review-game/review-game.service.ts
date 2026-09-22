import { GalleryPhoto } from '../shared/review-media.service';
import { API_URL } from '../../shared/api-url';
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ReviewGame {
  image: string;
  name: string;
  _id?: string;
  gallery?: GalleryPhoto[];
  imageFolder?: string;
  platForm: string;
  genres: string[];
  tier: string;
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
  readonly loadError = signal(false);
  readonly reviewGames = signal<ReviewGame[]>([]);

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

  createReviewGame(payload: ReviewGame) {
    return this.http.post<ReviewGame>(
      `${API_URL}/review-game`,
      payload
    );
  }

  getAllReviews() {
    return this.http.get<ReviewGame[]>(`${API_URL}/review-game`);
  }

  updateReviewGameByName(name: string, payload: ReviewGame, id = '') {
    return this.http.put<ReviewGame>(
      `${API_URL}/review-game/${id ? '_id' : 'name'}/${encodeURIComponent(id || name)}`,
      payload
    );
  }

  getPlatForms() {
    return this.http.get<string[]>(
      `${API_URL}/review-game/platForm`
    );
  }

  getGenres() {
    return this.http.get<string[]>(
      `${API_URL}/review-game/genres`
    );
  }

  prependReviewGame(item: ReviewGame) {
    this.reviewGames.update((list) => [item, ...list]);
  }

  replaceReviewGameByName(name: string, item: ReviewGame) {
    this.reviewGames.update((list) => {
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
      .get<ReviewGame[]>(`${API_URL}/review-game`)
      .subscribe({
        next: (data) => {
          this.reviewGames.set(data ?? []);
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
