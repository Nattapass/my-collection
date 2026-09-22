import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LibraryReview, ReviewLibraryComponent } from './review-library.component';

describe('ReviewLibraryComponent', () => {
  const records: LibraryReview[] = Array.from({length: 20}, (_, i) => ({
    id: String(i), name: 'Anime ' + i, image: '', tier: i === 0 ? 'S' : 'A',
    genres: [i % 2 ? 'Drama' : 'Fantasy'], values: { type: i % 2 ? 'Movie' : 'TV', episode: i }
  }));
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReviewLibraryComponent], providers: [provideRouter([])] }).compileComponents();
  });
  function create() {
    const fixture = TestBed.createComponent(ReviewLibraryComponent);
    fixture.componentRef.setInput('category', 'anime');
    fixture.componentRef.setInput('title', 'Anime');
    fixture.componentRef.setInput('items', records);
    fixture.componentRef.setInput('fields', [{key: 'type', label: 'Type', filter: true}, {key: 'episode', label: 'Episodes', numeric: true}]);
    fixture.detectChanges();
    return fixture;
  }
  it('combines name search and field filters without changing source data', () => {
    const fixture = create(), c = fixture.componentInstance;
    c.update({search: 'Anime 1'});
    c.filter('type', 'Movie');
    expect(c.filtered().length).toBe(6);
    c.filter('genres', 'Fantasy');
    expect(c.filtered().length).toBe(0);
    c.reset();
    expect(c.filtered().length).toBe(20);
    expect(records[0].name).toBe('Anime 0');
  });
  it('assigns distinct, bold tag backgrounds even with more than seven genres', () => {
    const fixture = create();
    fixture.componentRef.setInput('items', [{
      ...records[0], genres: Array.from({length: 12}, (_, i) => 'Genre ' + i)
    }]);
    fixture.detectChanges();
    const tags = Array.from(fixture.nativeElement.querySelectorAll('.genres span')) as HTMLElement[];
    expect(new Set(tags.map(tag => tag.style.backgroundColor)).size).toBe(12);
    expect(tags.every(tag => tag.style.fontWeight === '700')).toBeTrue();
  });
  it('sorts numeric fields and ranks S before A', () => {
    const c = create().componentInstance;
    c.sort('episode');
    c.sort('episode');
    expect(c.sorted()[0].values['episode']).toBe(19);
    c.sort('tier');
    expect(c.sorted()[0].tier).toBe('S');
  });
  it('clamps pages when data changes and remembers state after navigation', () => {
    const fixture = create(), c = fixture.componentInstance;
    c.update({page: 2});
    expect(c.visible().length).toBe(5);
    fixture.destroy();
    const restored = create();
    expect(restored.componentInstance.page()).toBe(2);
    restored.componentRef.setInput('items', records.slice(0, 3));
    restored.detectChanges();
    expect(restored.componentInstance.page()).toBe(1);
    expect(restored.componentInstance.visible().length).toBe(3);
  });
  it('renders all metadata without comments and emits edit for the selected row', () => {
    const fixture = create(), c = fixture.componentInstance;
    const edit = spyOn(c.edit, 'emit');
    const button = fixture.nativeElement.querySelector('.row-actions button') as HTMLButtonElement;
    button.click();
    expect(edit).toHaveBeenCalledWith('0');
    expect(fixture.nativeElement.querySelectorAll('dl dt').length).toBe(30);
    c.update({view: 'table'});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
  });
});
