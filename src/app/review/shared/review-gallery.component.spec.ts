import { TestBed } from '@angular/core/testing';
import { ReviewGalleryComponent } from './review-gallery.component';

describe('ReviewGallery', () => {
  beforeEach(() => jasmine.clock().install());
  afterEach(() => jasmine.clock().uninstall());
  it('advances, pauses during interaction, and resets after changing photos', () => {
    const fixture=TestBed.createComponent(ReviewGalleryComponent);
    fixture.componentRef.setInput('photos',[{url:'one.jpg'},{url:'two.jpg'}]);
    fixture.detectChanges();
    const c=fixture.componentInstance;
    c.paused.set(false);
    jasmine.clock().tick(6500);
    expect(c.index()).toBe(1);
    c.hovered=true;
    jasmine.clock().tick(6500);
    expect(c.index()).toBe(1);
    c.move(1);
    expect(c.index()).toBe(0);
    c.select(1);
    fixture.componentRef.setInput('photos',[{url:'new.jpg'}]);
    fixture.detectChanges();
    expect(c.index()).toBe(0);
    fixture.destroy();
  });
});
