import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MotionService } from './shared/motion';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly motion = inject(MotionService);
  title = 'my-collection';
  readonly menuOpen = signal(false);
  readonly currentUrl = signal('');
  readonly navigation = [
    { label: 'Dashboard', path: '/dashboard', category: '' },
    { label: 'Anime', path: '/review/review-anime', category: 'anime' },
    { label: 'Games', path: '/review/review-game', category: 'game' },
    { label: 'Books', path: '/review/review-book', category: 'book' },
    { label: 'Plamo', path: '/review/review-plamo', category: 'plamo' },
    { label: 'Tier List', path: '/tier-list', category: '' }
  ];

  constructor(private router: Router, public authService: AuthService) {
    this.currentUrl.set(router.url);
    router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
        this.menuOpen.set(false);
      }
    });
  }

  isActive(item: { path: string; category: string }): boolean {
    const path = this.currentUrl().split(/[?#]/)[0];
    return path === item.path || (!!item.category && path.startsWith('/full-review/' + item.category + '/'));
  }

  logout() {
    this.menuOpen.set(false);
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
