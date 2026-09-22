import { GalleryPhoto } from '../shared/review-media.service';
import { API_URL } from '../../shared/api-url';
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ReviewAnime {
  name: string;
  _id?: string;
  gallery?: GalleryPhoto[];
  imageFolder?: string;
  'premiered(JP)': string;
  image: string;
  'finished date': string;
  type: string;
  genres: string[];
  tier: string;
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
  readonly loadError = signal(false);
  readonly reviewAnime = signal<ReviewAnime[]>([]);

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

  createReviewAnime(payload: ReviewAnime) {
    return this.http.post<ReviewAnime>(
      `${API_URL}/review-anime`,
      payload
    );
  }

  getAllReviews() {
    return this.http.get<ReviewAnime[]>(`${API_URL}/review-anime`);
  }

  updateReviewAnimeByName(name: string, payload: ReviewAnime, id = '') {
    return this.http.put<ReviewAnime>(
      `${API_URL}/review-anime/${id ? '_id' : 'name'}/${encodeURIComponent(id || name)}`,
      payload
    );
  }

  getTypes() {
    return this.http.get<string[]>(
      `${API_URL}/review-anime/types`
    );
  }

  getGenres() {
    return this.http.get<string[]>(
      `${API_URL}/review-anime/genres`
    );
  }

  prependReviewAnime(item: ReviewAnime) {
    this.reviewAnime.update((list) => [item, ...list]);
  }

  replaceReviewAnimeByName(name: string, item: ReviewAnime) {
    this.reviewAnime.update((list) => {
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
      .get<ReviewAnime[]>(`${API_URL}/review-anime`)
      .subscribe({
        next: (data) => {
          this.reviewAnime.set(data ?? []);
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
