import { Injectable, inject } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, map, of, tap } from 'rxjs';
import { API_URL } from '../../shared/api-url';

export interface GalleryPhoto { key: string; caption?: string; }
export interface SignedPhoto extends GalleryPhoto { url: string; }
export interface UploadProgress { receipt?: string; uploaded?: boolean; key?: string; expiresAt?: number; }
export interface UploadContext { category: string; reviewName: string; folder?: string; }

@Injectable({ providedIn: 'root' })
export class ReviewMediaService {
  private readonly http = inject(HttpClient);
  // Bypass app interceptors for direct storage requests.
  private readonly storage = new HttpClient(inject(HttpBackend));
  private readonly cache = new Map<string, { url: string; expiresAt: number }>();

  async upload(blob: Blob, progress: UploadProgress, signal?: AbortSignal, context?: UploadContext): Promise<string> {
    if (progress.key) return progress.key;
    if (signal?.aborted) throw new Error('Upload cancelled');
    if (!progress.uploaded || !progress.receipt || (progress.expiresAt ?? 0) < Date.now()) {
      const ticket = await firstValueFrom(this.http.post<{url: string; receipt: string; folder?: string}>(API_URL + '/media/upload-url', { type: blob.type, size: blob.size, ...context }));
      if (context && ticket.folder) context.folder = ticket.folder;
      if (signal?.aborted) throw new Error('Upload cancelled');
      await firstValueFrom(this.storage.put(ticket.url, blob, { headers: { 'Content-Type': blob.type }, responseType: 'text' }));
      progress.receipt = ticket.receipt;
      progress.uploaded = true;
      progress.expiresAt = Date.now() + 10 * 60000;
    }
    if (signal?.aborted) throw new Error('Upload cancelled');
    const ready = await firstValueFrom(this.http.post<GalleryPhoto>(API_URL + '/media/complete', { receipt: progress.receipt }));
    progress.key = ready.key;
    return ready.key;
  }

  read(photos: GalleryPhoto[], force = false): Observable<SignedPhoto[]> {
    if (!photos.length) return of([]);
    if (!force && photos.every(photo => (this.cache.get(photo.key)?.expiresAt ?? 0) > Date.now() + 60000)) {
      return of(photos.map(photo => ({ ...photo, url: this.cache.get(photo.key)!.url })));
    }
    return this.http.post<{photos: SignedPhoto[]; expiresAt: number}>(API_URL + '/media/read-urls', { photos }).pipe(
      tap(result => {
        if (this.cache.size > 100) this.cache.clear();
        result.photos.forEach(photo => this.cache.set(photo.key, { url: photo.url, expiresAt: result.expiresAt }));
      }),
      map(result => result.photos)
    );
  }
}
