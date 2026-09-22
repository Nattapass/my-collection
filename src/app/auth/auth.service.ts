import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { API_URL } from '../shared/api-url';

interface Session { token: string; expiresAt: number; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly sessionKey = 'collection.session';
  private readonly session = signal<Session | null>(this.restore());
  readonly isAuthenticatedSignal = () => this.isAuthenticated();

  login(username: string, password: string) {
    return this.http.post<Session>(API_URL + '/auth/login', { username, password }).pipe(tap(session => {
      this.session.set(session);
      try { this.document.defaultView?.sessionStorage.setItem(this.sessionKey, JSON.stringify(session)); } catch { /* In-memory session still works. */ }
    }));
  }
  token(): string | null {
    const session = this.session();
    return session && session.expiresAt > Date.now() ? session.token : null;
  }
  isAuthenticated() { return Boolean(this.token()); }
  logout() {
    this.session.set(null);
    try { this.document.defaultView?.sessionStorage.removeItem(this.sessionKey); } catch { /* Storage may be disabled. */ }
  }
  private restore(): Session | null {
    try {
      const value = JSON.parse(this.document.defaultView?.sessionStorage.getItem(this.sessionKey) ?? 'null');
      return typeof value?.token === 'string' && Number.isFinite(value?.expiresAt) && value.expiresAt > Date.now() ? value : null;
    } catch { return null; }
  }
}
