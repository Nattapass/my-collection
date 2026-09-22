import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FullReviewComponent } from './full-review.component';

describe('FullReviewComponent', () => {
  let http: HttpTestingController;
  const params = new BehaviorSubject(convertToParamMap({type:'anime',id:'100% story'}));
  beforeEach(async () => {
    params.next(convertToParamMap({type:'anime',id:'100% story'}));
    await TestBed.configureTestingModule({
      imports:[FullReviewComponent],
      providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
        {provide:ActivatedRoute,useValue:{paramMap:params}}]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('waits for direct-link data, loads only its category and preserves percent in titles', () => {
    const fixture=TestBed.createComponent(FullReviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(fixture.componentInstance.item()).toBeNull();
    http.expectOne('https://service-collection.vercel.app/review-anime').flush([
      {name:'100% story',tier:'S',genres:['Drama'],image:'',comment:'First line\nSecond line',episode:12,type:'TV','premiered(JP)':'2026','finished date':'2026'}
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.item()?.name).toBe('100% story');
    expect(fixture.nativeElement.querySelector('.comment').textContent).toContain('Second line');
    expect(fixture.nativeElement.querySelector('.gallery')).toBeNull();
    http.expectNone(req => req.url.includes('review-books'));
  });
  it('handles failed requests and retries without showing not-found as a loading state', () => {
    spyOn(console,'error');
    const fixture=TestBed.createComponent(FullReviewComponent);
    http.expectOne('https://service-collection.vercel.app/review-anime').flush(null,{status:500,statusText:'Error'});
    expect(fixture.componentInstance.error()).toBeTrue();
    fixture.componentInstance.retry();
    http.expectOne('https://service-collection.vercel.app/review-anime').flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.componentInstance.item()).toBeNull();
  });
  it('resolves stored image keys and renews URLs before they expire', fakeAsync(() => {
    const fixture = TestBed.createComponent(FullReviewComponent);
    const gallery = [{key:'reviews/photo.webp',caption:'Photo'}];
    http.expectOne('https://service-collection.vercel.app/review-anime').flush([{name:'100% story',genres:[],gallery}]);
    fixture.detectChanges();
    tick(0);
    const read = http.expectOne('https://service-collection.vercel.app/media/read-urls');
    expect(read.request.body.photos).toEqual(gallery);
    read.flush({expiresAt:Date.now()+3600000,photos:[{...gallery[0],url:'https://example.com/first'}]});
    expect(fixture.componentInstance.photos()[0].url).toBe('https://example.com/first');
    tick(50*60000);
    http.expectOne('https://service-collection.vercel.app/media/read-urls').flush({expiresAt:Date.now()+3600000,photos:[{...gallery[0],url:'https://example.com/renewed'}]});
    expect(fixture.componentInstance.photos()[0].url).toBe('https://example.com/renewed');
    fixture.destroy();
  }));
});
