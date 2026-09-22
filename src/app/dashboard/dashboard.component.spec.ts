import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let http: HttpTestingController;
  const sample = (name: string) => ({ name, image: '', tier: 'A', genres: ['Adventure'] });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    jasmine.clock().install();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    jasmine.clock().uninstall();
  });

  function load() {
    http.expectOne('https://service-collection.vercel.app/review-anime').flush([sample('First'), sample('Second'), sample('Third')]);
    http.expectOne('https://service-collection.vercel.app/review-game').flush([sample('Game')]);
    http.expectOne('https://service-collection.vercel.app/review-books').flush([]);
    http.expectOne('https://service-collection.vercel.app/review-plamo').flush([]);
    fixture.detectChanges();
  }

  it('renders real reviews, empty categories and links to existing routes', () => {
    load();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('article').length).toBe(4);
    expect(root.textContent).toContain('No Books reviews yet.');
    expect(root.querySelector('a.read-link')?.getAttribute('href')).toContain('/full-review/anime/');
    expect(root.querySelectorAll('.cover-fallback').length).toBe(2);
  });

  it('visits each review once per cycle and avoids an immediate repeat across cycles', () => {
    load();
    const seen = [component.selected()[0]!.name];
    for (let i = 0; i < 2; i++) {
      component.next(0);
      seen.push(component.selected()[0]!.name);
    }
    expect(new Set(seen).size).toBe(3);
    component.next(0);
    expect(component.selected()[0]!.name).not.toBe(seen[2]);
    component.next(1);
    expect(component.selected()[1]!.name).toBe('Game');
    component.next(2);
    expect(component.selected()[2]).toBeNull();
  });

  it('rotates without refetching and pauses during interaction', () => {
    load();
    component.paused.set(false);
    const initial = component.selected()[0];
    component.hovered = true;
    jasmine.clock().tick(8000);
    expect(component.selected()[0]).toBe(initial);
    component.hovered = false;
    component.focused = true;
    jasmine.clock().tick(8000);
    expect(component.selected()[0]).toBe(initial);
    component.focused = false;
    jasmine.clock().tick(8000);
    expect(component.selected()[0]).not.toBe(initial);
    const next = component.selected()[0];
    component.paused.set(true);
    jasmine.clock().tick(8000);
    expect(component.selected()[0]).toBe(next);
    http.expectNone(request => true);
    fixture.destroy();
  });

  it('distinguishes errors from empty results and supports retry', () => {
    spyOn(console, 'error');
    http.expectOne('https://service-collection.vercel.app/review-anime').flush('Failed', { status: 500, statusText: 'Error' });
    http.expectOne('https://service-collection.vercel.app/review-game').flush([]);
    http.expectOne('https://service-collection.vercel.app/review-books').flush([]);
    http.expectOne('https://service-collection.vercel.app/review-plamo').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load reviews.');
    component.groups[0].retry();
    expect(component.groups[0].error()).toBeFalse();
    http.expectOne('https://service-collection.vercel.app/review-anime').flush([sample('Recovered')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Recovered');
  });
});
