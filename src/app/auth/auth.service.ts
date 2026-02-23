import { Inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly sessionKey = 'isAuthenticated';
  private readonly fixedUsername = 'admin';
  private readonly fixedPassword = '1234';
  private readonly authenticated = signal(false);

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.authenticated.set(this.readSessionAuth());
  }

  readonly isAuthenticatedSignal = this.authenticated.asReadonly();

  login(username: string, password: string): boolean {
    const isValid =
      username === this.fixedUsername && password === this.fixedPassword;

    if (!isValid) {
      return false;
    }

    this.authenticated.set(true);
    this.setSessionAuth(true);
    return true;
  }

  logout(): void {
    this.authenticated.set(false);
    this.setSessionAuth(false);
  }

  isAuthenticated(): boolean {
    return this.authenticated();
  }

  private readSessionAuth(): boolean {
    try {
      return this.document.defaultView?.sessionStorage?.getItem(this.sessionKey) === 'true';
    } catch {
      return false;
    }
  }

  private setSessionAuth(isAuthenticated: boolean): void {
    try {
      const storage = this.document.defaultView?.sessionStorage;
      if (!storage) {
        return;
      }
      if (isAuthenticated) {
        storage.setItem(this.sessionKey, 'true');
        return;
      }
      storage.removeItem(this.sessionKey);
    } catch {
      // ignore storage write errors (SSR/private mode/disabled storage)
    }
  }
}
