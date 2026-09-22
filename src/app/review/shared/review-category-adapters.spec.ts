import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewBookComponent } from '../review-book/review-book.component';
import { ReviewGameComponent } from '../review-game/review-game.component';
import { ReviewPlamoComponent } from '../review-plamo/review-plamo.component';

const cases = [
  { category: 'book', component: ReviewBookComponent, endpoint: 'review-books', values: {type: 'Novel', license: 'Publisher', finishedDate: '2026-01-01', total: 4} },
  { category: 'game', component: ReviewGameComponent, endpoint: 'review-game', values: {platForm: 'PC', startDate: '2026-01-01', endDate: '2026-02-01'} },
  { category: 'plamo', component: ReviewPlamoComponent, endpoint: 'review-plamo', values: {line: 'MG', finishedDate: '2026-01-01'} }
];

for (const entry of cases) {
  describe(entry.category + ' library adapter', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [entry.component],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
      }).compileComponents();
    });
    it('maps category fields, preserves edit data, and reuses cached results', () => {
      const http = TestBed.inject(HttpTestingController);
      const fixture = TestBed.createComponent<ReviewBookComponent | ReviewGameComponent | ReviewPlamoComponent>(entry.component);
      fixture.detectChanges();
      const payload = {name: 'Sample', image: '', tier: 'S', genres: ['Fantasy'], ...entry.values};
      http.expectOne('https://service-collection.vercel.app/' + entry.endpoint).flush([payload]);
      fixture.detectChanges();
      expect(fixture.componentInstance.items()[0].values).toEqual(entry.values);
      expect(fixture.nativeElement.querySelector('.library').getAttribute('data-category')).toBe(entry.category);
      expect(fixture.nativeElement.querySelectorAll('dl dt').length).toBe(Object.keys(entry.values).length);
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      fixture.componentInstance.edit('0');
      expect(navigate).toHaveBeenCalledWith(['/review/add-review'], {
        queryParams: {mode: 'edit', category: 'review-' + entry.category, fieldName: 'name', fieldValue: 'Sample'},
        state: {editData: payload}
      });
      fixture.componentInstance.ngOnInit();
      http.expectNone('https://service-collection.vercel.app/' + entry.endpoint);
      http.verify();
    });
  });
}
