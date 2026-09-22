import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { TierListComponent } from './tier-list.component';

describe('TierListComponent', () => {
  let http: HttpTestingController;
  const params = new BehaviorSubject(convertToParamMap({category:'book'}));
  beforeEach(async () => {
    params.next(convertToParamMap({category:'book'}));
    await TestBed.configureTestingModule({
      imports:[TierListComponent],
      providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
        {provide:ActivatedRoute,useValue:{queryParamMap:params}}]
    }).compileComponents();
    http=TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads only the linked category, keeps genre threshold, and links covers to full review', () => {
    const fixture=TestBed.createComponent(TierListComponent);
    http.expectOne('https://service-collection.vercel.app/review-books').flush(
      Array.from({length:5},(_,i)=>({name:'Book '+i,image:'',tier:i===0?' s ':'A',genres:i===0?['Fantasy','Fantasy','Rare']:['Fantasy']}))
    );
    fixture.detectChanges();
    const c=fixture.componentInstance;
    expect(c.selectedCategory()).toBe('book');
    expect(c.genres()).toEqual(['Fantasy']);
    expect(c.itemsForTier('S').length).toBe(1);
    expect(fixture.nativeElement.querySelector('a.poster').getAttribute('href')).toContain('/full-review/book/');
    c.toggleTemplate('Fantasy');
    expect(c.isCollapsed('Fantasy')).toBeTrue();
    params.next(convertToParamMap({category:'book'}));
    http.expectNone('https://service-collection.vercel.app/review-books');
  });
  it('supports legacy modelkit links and writes category selection to the URL', () => {
    params.next(convertToParamMap({category:'modelkit'}));
    const fixture=TestBed.createComponent(TierListComponent);
    http.expectOne('https://service-collection.vercel.app/review-plamo').flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedCategory()).toBe('plamo');
    const navigate=spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);
    fixture.componentInstance.selectCategory('game');
    expect(navigate).toHaveBeenCalledWith([],jasmine.objectContaining({queryParams:{category:'game'}}));
  });
  it('retries failures and refreshes only the selected category', () => {
    spyOn(console,'error');
    const fixture=TestBed.createComponent(TierListComponent);
    http.expectOne('https://service-collection.vercel.app/review-books').flush(null,{status:500,statusText:'Error'});
    expect(fixture.componentInstance.loadError()).toBeTrue();
    fixture.componentInstance.refresh();
    http.expectOne('https://service-collection.vercel.app/review-books').flush([]);
    expect(fixture.componentInstance.loadError()).toBeFalse();
  });
});
