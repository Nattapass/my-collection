import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './auth/auth.service';

@Component({ template: '' })
class EmptyPage {}

describe('AppComponent navigation', () => {
  const authenticated = signal(true);
  const logout = jasmine.createSpy('logout');

  beforeEach(async () => {
    authenticated.set(true);
    logout.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([{ path: '**', component: EmptyPage }]),
        { provide: AuthService, useValue: { isAuthenticated: authenticated, logout } }
      ]
    }).compileComponents();
  });

  it('shows direct review links and removes retired collection menus', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const links = Array.from(fixture.nativeElement.querySelectorAll('.nav-links a')) as HTMLAnchorElement[];
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/dashboard', '/review/review-anime', '/review/review-game',
      '/review/review-book', '/review/review-plamo', '/tier-list'
    ]);
  });

  it('tracks navigation and closes the mobile menu after navigation', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.componentInstance.menuOpen.set(true);
    await TestBed.inject(Router).navigateByUrl('/full-review/game/example');
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[aria-current="page"]').textContent).toBe('Games');
  });

  it('toggles the mobile menu and supports Escape', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('hides navigation when logged out and preserves logout behavior', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture.nativeElement.querySelector('.logout').click();
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login');
    authenticated.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });
});
