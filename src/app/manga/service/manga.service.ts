import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { IManga } from '../interface/manga.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MangaService {
  private readonly loaded = signal(false);
  readonly isLoading = signal(false);
  readonly mangaList = signal<IManga[]>([]);

  constructor(private http: HttpClient) { }

  getMangaList(): Observable<IManga[]> {
    return this.http
      .get<IManga[]>('https://service-collection.vercel.app/manga')
  }

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
    this.getMangaList().subscribe({
      next: (data) => {
        this.mangaList.set(data ?? []);
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
