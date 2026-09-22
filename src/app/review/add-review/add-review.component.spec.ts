import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AddReviewComponent } from './add-review.component';

describe('AddReview editor', () => {
  it('keeps existing edit data, locks the category and exposes local photo preview', async () => {
    const previous = history.state;
    history.replaceState({editData:{name:'Example',type:'TV',image:'',genres:['Drama'],tier:'A',episode:12,comment:'Long review','premiered(JP)':'2026','finished date':'2026'}},'');
    try {
      await TestBed.configureTestingModule({
        imports:[AddReviewComponent],
        providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
          {provide:ActivatedRoute,useValue:{queryParamMap:of(convertToParamMap({mode:'edit',category:'review-anime',fieldValue:'Example'}))}}]
      }).compileComponents();
      const fixture=TestBed.createComponent(AddReviewComponent);
      fixture.detectChanges();
      const http=TestBed.inject(HttpTestingController);
      http.expectOne('https://service-collection.vercel.app/review-anime/genres').flush(['Drama']);
      http.expectOne('https://service-collection.vercel.app/review-anime/types').flush(['TV']);
      fixture.detectChanges();
      expect(fixture.componentInstance.reviewAnimeForm.get('name')?.value).toBe('Example');
      expect(fixture.componentInstance.isEditMode()).toBeTrue();
      expect(fixture.nativeElement.querySelector('select').disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('app-review-photo-picker')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('textarea').rows).toBe(9);
      http.verify();
    } finally {history.replaceState(previous,'');}
  });
});
