import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { MangaListComponent } from './manga/manga-list/manga-list.component';
import { ModelKitListComponent } from './model-kit/model-kit-list/model-kit-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ReviewComponent } from './review/review.component';
import { ReviewBookComponent } from './review/review-book/review-book.component';
import { ReviewGameComponent } from './review/review-game/review-game.component';
import { AddReviewComponent } from './review/add-review/add-review.component';
import { ReviewAnimeComponent } from './review/review-anime/review-anime.component';
import { ReviewPlamoComponent } from './review/review-plamo/review-plamo.component';
import { LoginComponent } from './login/login.component';
import { authGuard, loginGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [authGuard]
  },
  {
    path: 'model-kit',
    component: ModelKitListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'manga',
    component: MangaListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'review',
    component: ReviewComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'review-book' },
      { path: 'review-book', component: ReviewBookComponent },
      { path: 'review-game', component: ReviewGameComponent },
      { path: 'review-anime', component: ReviewAnimeComponent },
      { path: 'review-plamo', component: ReviewPlamoComponent },
      { path: 'add-review', component: AddReviewComponent }
    ]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
