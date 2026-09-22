import { Injectable } from '@angular/core';

export interface LibraryState {
  search: string;
  filters: Record<string, string>;
  sort: string;
  descending: boolean;
  page: number;
  size: number;
  view: 'list' | 'table';
}

@Injectable({ providedIn: 'root' })
export class ReviewLibraryState {
  private readonly states = new Map<string, LibraryState>();
  get(category: string): LibraryState {
    return this.states.get(category) ?? {
      search: '', filters: {}, sort: '', descending: false, page: 1, size: 15, view: 'list'
    };
  }
  save(category: string, state: LibraryState) { this.states.set(category, state); }
}
