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
    this.document.defaultView?.sessionStorage.setItem(this.sessionKey, 'true');
    return true;
  }

  logout(): void {
    this.authenticated.set(false);
    this.document.defaultView?.sessionStorage.removeItem(this.sessionKey);
  }

  isAuthenticated(): boolean {
    return this.authenticated();
  }

  private readSessionAuth(): boolean {
    return (
      this.document.defaultView?.sessionStorage.getItem(this.sessionKey) ===
      'true'
    );
  }
}
