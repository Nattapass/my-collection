import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import Swal from 'sweetalert2';
import { AddReviewComponent } from './add-review.component';
import { API_URL } from '../../shared/api-url';
import { ReviewEditorDataService } from './review-editor-data.service';
import { ReviewMediaService } from '../shared/review-media.service';
import { ReviewCategory } from './review-editor.config';

const cases: { category: ReviewCategory; endpoint: string; choices: string; values: Record<string, unknown> }[] = [
  { category: 'review-anime', endpoint: 'review-anime', choices: 'types', values: { type: 'TV', episode: 12, 'premiered(JP)': '2026', 'finished date': '2026' } },
  { category: 'review-book', endpoint: 'review-books', choices: 'license', values: { type: 'Manga', license: 'Publisher', total: 3, finishedDate: '2026' } },
  { category: 'review-game', endpoint: 'review-game', choices: 'platForm', values: { platForm: 'PC', startDate: '2026', endDate: '2026' } },
  { category: 'review-plamo', endpoint: 'review-plamo', choices: 'line', values: { line: 'HG', finishedDate: '2026' } },
];
const base = { name: 'Example', image: 'https://example.com/cover.jpg', genres: ['Drama'], tier: 'A', comment: 'Line 1\nLine 2' };

describe('Shared review editor', () => {
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let http: HttpTestingController;
  let previous: unknown;
  beforeEach(() => {
    previous = history.state;
    history.replaceState({}, '');
    params = new BehaviorSubject(convertToParamMap({ category: 'review-anime' }));
    TestBed.configureTestingModule({ imports: [AddReviewComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: ReviewMediaService, useValue: { read: () => of([]) } },
    ] });
    http = TestBed.inject(HttpTestingController);
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true, isDenied: false, isDismissed: false });
  });
  afterEach(() => { http.verify(); history.replaceState(previous, ''); });
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  function options(item: typeof cases[number]) {
    http.expectOne(`${API_URL}/${item.endpoint}/genres`).flush(['Drama']);
    http.expectOne(`${API_URL}/${item.endpoint}/${item.choices}`).flush([]);
  }
  for (const item of cases) {
    it(`creates ${item.category} with its fields and updates the existing list cache`, async () => {
      params.next(convertToParamMap({ category: item.category }));
      const fixture = TestBed.createComponent(AddReviewComponent);
      fixture.detectChanges(); options(item); fixture.detectChanges();
      const component = fixture.componentInstance;
      expect(fixture.nativeElement.querySelectorAll('form').length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('app-review-form-fields').length).toBe(1);
      const payload = { ...base, ...item.values };
      component.activeForm().patchValue(payload);
      expect(component.activeForm().valid).toBeTrue();
      component.submit();
      component.submit(); // Repeated click must not duplicate the request.
      http.expectOne(`${API_URL}/${item.endpoint}`).flush([]);
      await tick();
      const request = http.expectOne(`${API_URL}/${item.endpoint}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ ...payload, gallery: [], imageFolder: undefined });
      const saved = { ...request.request.body, _id: 'saved-id' };
      request.flush(saved);
      expect(TestBed.inject(ReviewEditorDataService).categories[item.category].cached()[0]._id).toBe('saved-id');
      expect(component.activeForm().get('name')?.value).toBe('');
      expect(component.isSaving()).toBeFalse();
      fixture.destroy();
    });
    it(`restores ${item.category} from a cold edit link and updates by id`, async () => {
      params.next(convertToParamMap({ mode: 'edit', category: item.category, fieldName: '_id', fieldValue: 'existing-id' }));
      const fixture = TestBed.createComponent(AddReviewComponent);
      fixture.detectChanges(); options(item);
      const record = { ...base, ...item.values, _id: 'existing-id', gallery: [{ key: 'reviews/old.webp', caption: 'My memory' }] };
      http.expectOne(`${API_URL}/${item.endpoint}`).flush([record]);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      expect(component.activeForm().get('name')?.value).toBe('Example');
      expect(fixture.nativeElement.querySelector('#review-category').disabled).toBeTrue();
      component.activeForm().get('name')?.setValue('Renamed');
      component.submit(); await tick();
      const request = http.expectOne(`${API_URL}/${item.endpoint}/_id/existing-id`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body.gallery).toEqual(record.gallery);
      request.flush({ ...record, ...request.request.body });
      expect(component.successMessage()).toBeTruthy();
      fixture.destroy();
    });
  }
  it('rejects blank names, negative/fractional counts and unsafe cover URLs without calling the API', () => {
    const fixture = TestBed.createComponent(AddReviewComponent);
    fixture.detectChanges(); options(cases[0]); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.activeForm().patchValue({ ...base, ...cases[0].values, name: ' ', episode: -1, image: 'javascript:alert(1)' });
    component.submit();
    expect(component.activeForm().get('name')?.invalid).toBeTrue();
    expect(component.activeForm().get('episode')?.invalid).toBeTrue();
    expect(component.activeForm().get('image')?.invalid).toBeTrue();
    component.activeForm().get('episode')?.setValue(1.5);
    expect(component.activeForm().get('episode')?.invalid).toBeTrue();
    http.expectNone(`${API_URL}/review-anime`);
    fixture.destroy();
  });
  it('cancels old category requests, keeps fields separate and clears old photos on category changes', () => {
    const fixture = TestBed.createComponent(AddReviewComponent);
    fixture.detectChanges();
    const oldGenres = http.expectOne(`${API_URL}/review-anime/genres`);
    const oldTypes = http.expectOne(`${API_URL}/review-anime/types`);
    fixture.componentInstance.activeForm().get('name')?.setValue('Anime draft');
    params.next(convertToParamMap({ category: 'review-game' }));
    expect(oldGenres.cancelled).toBeTrue(); expect(oldTypes.cancelled).toBeTrue();
    options(cases[2]); fixture.detectChanges();
    expect(fixture.componentInstance.activeForm().contains('episode')).toBeFalse();
    expect(fixture.componentInstance.activeForm().contains('platForm')).toBeTrue();
    expect(fixture.componentInstance.photoPicker()?.photos()).toEqual([]);
    params.next(convertToParamMap({ category: 'review-anime' })); options(cases[0]); fixture.detectChanges();
    expect(fixture.componentInstance.activeForm().get('name')?.value).toBe('Anime draft');
    fixture.destroy();
  });
  it('blocks an existing book of the same name and type without uploading or saving', async () => {
    params.next(convertToParamMap({ category: 'review-book' }));
    const fixture = TestBed.createComponent(AddReviewComponent);
    fixture.detectChanges(); options(cases[1]); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.activeForm().patchValue({ ...base, ...cases[1].values });
    component.submit();
    http.expectOne(`${API_URL}/review-books`).flush([{ ...base, ...cases[1].values }]);
    await tick();
    expect(component.isSaving()).toBeFalse();
    expect(component.errorMessage()).toContain('อยู่แล้ว');
    http.expectNone(`${API_URL}/review-books`);
    fixture.destroy();
  });
});
