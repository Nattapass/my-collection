import { TestBed } from '@angular/core/testing';
import { ReviewFormFieldsComponent } from './review-form-fields.component';
import { createEditorForm, REVIEW_EDITORS, ReviewCategory } from './review-editor.config';

describe('Review form field interactions', () => {
  function setup(category: ReviewCategory = 'review-anime') {
    const fixture = TestBed.createComponent(ReviewFormFieldsComponent);
    const config = REVIEW_EDITORS[category];
    const form = createEditorForm(config);
    fixture.componentRef.setInput('config', config);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('choices', ['TV', 'Movie']);
    fixture.componentRef.setInput('genreOptions', ['Drama', 'Comedy']);
    fixture.detectChanges();
    return { fixture, form, component: fixture.componentInstance };
  }
  it('switches between an existing choice and a custom value without losing edit values', () => {
    const { fixture, form, component } = setup();
    form.patchValue({ type: 'OVA' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[aria-label="ประเภทอนิเมะ ใหม่"]')).toBeTruthy();
    component.choose('type', 'TV'); fixture.detectChanges();
    expect(form.get('type')?.value).toBe('TV');
    expect(fixture.nativeElement.querySelector('input[aria-label="ประเภทอนิเมะ ใหม่"]')).toBeNull();
    component.choose('type', '__custom'); fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="ประเภทอนิเมะ ใหม่"]');
    input.value = 'ONA'; input.dispatchEvent(new Event('input'));
    expect(form.get('type')?.value).toBe('ONA');
  });
  it('adds trimmed tags, ignores case-insensitive duplicates, and allows removing them', () => {
    const { form, component } = setup();
    component.addGenre(' Drama '); component.addGenre('drama'); component.addGenre('Comedy');
    expect(form.get('genres')?.value).toEqual(['Drama', 'Comedy']);
    component.removeGenre('Drama');
    expect(form.get('genres')?.value).toEqual(['Comedy']);
  });
  it('retains approximate text dates and maps calendar dates to the existing API format', () => {
    const { fixture, form, component } = setup();
    form.patchValue({ 'premiered(JP)': '~09/2026' }); fixture.detectChanges();
    expect(form.get('premiered(JP)')?.value).toBe('~09/2026');
    component.setDate('premiered(JP)', '2026-09-23'); fixture.detectChanges();
    expect(form.get('premiered(JP)')?.value).toBe('23/09/2026');
    expect(fixture.nativeElement.querySelector('input[type="date"]').value).toBe('2026-09-23');
  });
  for (const [category, field] of [['review-anime', 'episode'], ['review-book', 'total']] as const) {
    it(`keeps typed ${field} numeric and validates empty/negative/fractional values`, () => {
      const { fixture, form } = setup(category);
      const input: HTMLInputElement = fixture.nativeElement.querySelector('#review-' + field);
      input.value = '12'; input.dispatchEvent(new Event('input'));
      expect(form.get(field)?.value).toBe(12);
      input.value = '0'; input.dispatchEvent(new Event('input'));
      expect(form.get(field)?.value).toBe(0);
      expect(form.get(field)?.valid).toBeTrue();
      for (const invalid of ['', '-1', '1.5']) {
        input.value = invalid; input.dispatchEvent(new Event('input'));
        expect(form.get(field)?.invalid).toBeTrue();
      }
    });
  }
});
