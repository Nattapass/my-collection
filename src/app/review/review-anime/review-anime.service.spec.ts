import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewAnime, ReviewAnimeService } from './review-anime.service';

describe('ReviewAnimeService cache', () => {
  let service: ReviewAnimeService;
  let http: HttpTestingController;
  const url = 'https://service-collection.vercel.app/review-anime';
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    service = TestBed.inject(ReviewAnimeService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads once, deduplicates pending requests, and refreshes only on demand', () => {
    service.loadOnce();
    service.loadOnce();
    service.refresh();
    http.expectOne(url).flush([]);
    service.loadOnce();
    http.expectNone(url);
    service.refresh();
    http.expectOne(url).flush([]);
  });
  it('allows retry after failure and updates cached data after save without a GET', () => {
    spyOn(console, 'error');
    service.loadOnce();
    http.expectOne(url).flush(null, {status: 500, statusText: 'Error'});
    expect(service.loadError()).toBeTrue();
    service.loadOnce();
    http.expectOne(url).flush([]);
    const item = {name: 'Saved', tier: 'A'} as ReviewAnime;
    service.prependReviewAnime(item);
    service.replaceReviewAnimeByName('Saved', {...item, tier: 'S'});
    expect(service.reviewAnime()[0].tier).toBe('S');
    http.expectNone(url);
  });
});
