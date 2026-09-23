import { TestBed } from '@angular/core/testing';
import { CollectionSearchComponent } from './collection-search.component';
import { PaginationComponent } from './pagination.component';
import { IManga } from '../manga/interface/manga.interface';

describe('Collection controls without Bootstrap', () => {
  it('selects a matching record and clears the selection when the query changes', () => {
    const fixture = TestBed.createComponent(CollectionSearchComponent);
    const record = { no: '1', name: 'Example', type: 'Manga' } as IManga;
    fixture.componentRef.setInput('items', [record]); fixture.detectChanges();
    const selected = jasmine.createSpy('selected');
    fixture.componentInstance.selected.subscribe(selected);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'exam'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    const result: HTMLButtonElement = fixture.nativeElement.querySelector('li button');
    expect(result.textContent).toContain('Example'); result.click(); fixture.detectChanges();
    expect(selected).toHaveBeenCalledWith(record);
    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
    input.value = ''; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(selected.calls.mostRecent().args).toEqual([null]);
  });
  it('emits page changes, disables boundaries, and clamps the page when the list shrinks', () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('collectionSize', 121); fixture.detectChanges();
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.page.subscribe(changed);
    fixture.nativeElement.querySelector('[aria-label="Last page"]').click(); fixture.detectChanges();
    expect(changed).toHaveBeenCalledWith(7);
    expect(fixture.nativeElement.querySelector('[aria-label="Next page"]').disabled).toBeTrue();
    fixture.componentRef.setInput('collectionSize', 15); fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(1);
    expect(changed).toHaveBeenCalledWith(1);
  });
});
