import { Routes } from '@angular/router';

import { authGuard, loginGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent),
    canActivate: [authGuard]
  },
  {
    path: 'model-kit',
    loadComponent: () => import('./model-kit/model-kit-list/model-kit-list.component').then(m => m.ModelKitListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'manga',
    loadComponent: () => import('./manga/manga-list/manga-list.component').then(m => m.MangaListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'review',
    loadComponent: () => import('./review/review.component').then(m => m.ReviewComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'review-book' },
      { path: 'review-book', loadComponent: () => import('./review/review-book/review-book.component').then(m => m.ReviewBookComponent) },
      { path: 'review-game', loadComponent: () => import('./review/review-game/review-game.component').then(m => m.ReviewGameComponent) },
      { path: 'review-anime', loadComponent: () => import('./review/review-anime/review-anime.component').then(m => m.ReviewAnimeComponent) },
      { path: 'review-plamo', loadComponent: () => import('./review/review-plamo/review-plamo.component').then(m => m.ReviewPlamoComponent) },
      { path: 'add-review', loadComponent: () => import('./review/add-review/add-review.component').then(m => m.AddReviewComponent) }
    ]
  },
  {
    path: 'full-review/:type/:id',
    loadComponent: () => import('./review/full-review/full-review.component').then(m => m.FullReviewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tier-list',
    loadComponent: () => import('./tier-list/tier-list.component').then(m => m.TierListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
