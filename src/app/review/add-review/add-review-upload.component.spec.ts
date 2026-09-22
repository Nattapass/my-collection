import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import Swal from 'sweetalert2';
import { AddReviewComponent } from './add-review.component';
import { ReviewMediaService } from '../shared/review-media.service';
import { API_URL } from '../../shared/api-url';

describe('Saving review galleries', () => {
  const media = { read: () => of([]), upload: jasmine.createSpy('upload') };
  beforeEach(() => {
    TestBed.configureTestingModule({imports:[AddReviewComponent],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
      {provide:ReviewMediaService,useValue:media},
      {provide:ActivatedRoute,useValue:{queryParamMap:of(convertToParamMap({category:'review-anime'}))}}]});
    spyOn(Swal,'fire').and.resolveTo({isConfirmed:true,isDenied:false,isDismissed:false});
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function setup() {
    const fixture = TestBed.createComponent(AddReviewComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(API_URL + '/review-anime/genres').flush([]);
    http.expectOne(API_URL + '/review-anime/types').flush([]);
    const component = fixture.componentInstance;
    component.reviewAnimeForm.patchValue({name:'Example',image:'https://example.com/cover.jpg',genres:['Drama'],tier:'A',episode:12,type:'TV','premiered(JP)':'2026','finished date':'2026'});
    const blob = new Blob(['photo'],{type:'image/webp'});
    component.photoPicker()!.photos.set([{url:URL.createObjectURL(blob),name:'Photo',original:5,size:5,blob,progress:{}}]);
    return {fixture,http,component};
  }
  it('sends persistent keys with the review only after the uploads finish', async () => {
    media.upload.and.callFake(async (_blob: Blob, _progress: unknown, _signal: unknown, context: {folder?: string; category: string; reviewName: string}) => {
      expect(context.category).toBe('anime');
      expect(context.reviewName).toBe('Example');
      context.folder = 'reviews/anime/example--folder-id';
      return 'reviews/new.webp';
    });
    const {fixture,http,component} = setup();
    component.submitReviewAnime();
    http.expectOne(API_URL + '/review-anime').flush([]); // Duplicate check.
    await new Promise(resolve => setTimeout(resolve, 0));
    const save = http.expectOne(API_URL + '/review-anime');
    expect(save.request.method).toBe('POST');
    expect(save.request.body.gallery).toEqual([{key:'reviews/new.webp',caption:'Photo'}]);
    expect(save.request.body.imageFolder).toBe('reviews/anime/example--folder-id');
    expect(save.request.body.image).toBe('https://example.com/cover.jpg');
    save.flush(save.request.body);
    expect(component.photoPicker()!.photos()).toEqual([]);
    expect(component.isSaving()).toBeFalse();
    fixture.destroy();
  });
  it('does not save an incomplete gallery and leaves the selected file available to retry', async () => {
    media.upload.and.rejectWith(new Error('Upload failed'));
    const {fixture,http,component} = setup();
    component.submitReviewAnime();
    http.expectOne(API_URL + '/review-anime').flush([]);
    await new Promise(resolve => setTimeout(resolve, 0));
    http.expectNone(API_URL + '/review-anime');
    expect(component.photoPicker()!.photos().length).toBe(1);
    expect(component.isSaving()).toBeFalse();
    expect(component.errorMessage()).toBeTruthy();
    fixture.destroy();
  });
});
