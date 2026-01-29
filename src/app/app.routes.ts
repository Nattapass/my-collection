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

export const routes: Routes = [
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'model-kit',
    component: ModelKitListComponent,
  },
  {
    path: 'manga',
    component: MangaListComponent,
  },
  {
    path: 'review',
    component: ReviewComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'review-book' },
      { path: 'review-book', component: ReviewBookComponent },
      { path: 'review-game', component: ReviewGameComponent },
      { path: 'review-anime', component: ReviewAnimeComponent },
      { path: 'add-review', component: AddReviewComponent }
    ]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  { path: '',   redirectTo: '/dashboard', pathMatch: 'full' }, 
  { path: '**', component: DashboardComponent }
];
