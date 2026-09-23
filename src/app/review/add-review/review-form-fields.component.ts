import { Component, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { GenreColorDirective } from '../../shared/genre-color.directive';
import { dateInputValue, displayDate, EditorConfig } from './review-editor.config';

@Component({
  selector: 'app-review-form-fields',
  imports: [ReactiveFormsModule, GenreColorDirective],
  templateUrl: './review-form-fields.component.html',
  styleUrl: './review-form-fields.component.scss',
})
export class ReviewFormFieldsComponent {
  readonly form = input.required<FormGroup>();
  readonly config = input.required<EditorConfig>();
  readonly choices = input<readonly string[]>([]);
  readonly genreOptions = input<readonly string[]>([]);
  readonly customFields = signal<Record<string, boolean>>({});
  readonly dateInputValue = dateInputValue;

  custom(key: string): boolean {
    const value = this.form().get(key)?.value;
    return this.customFields()[key] || Boolean(value && !this.choices().includes(value));
  }
  inputId(key: string): string { return `review-${key.replace(/[^a-zA-Z0-9-]/g, '-')}`; }
  choose(key: string, value: string) {
    this.customFields.update(fields => ({ ...fields, [key]: value === '__custom' }));
    this.form().get(key)?.setValue(value === '__custom' ? '' : value);
    this.form().get(key)?.markAsTouched();
  }
  setDate(key: string, value: string) {
    this.form().get(key)?.setValue(displayDate(value));
    this.form().get(key)?.markAsTouched();
  }
  genres(): string[] { return this.form().get('genres')?.value ?? []; }
  addGenre(value: string) {
    const genre = value.trim();
    if (!genre || genre.length > 200 || this.genres().length >= 100 || this.genres().some(item => item.toLowerCase() === genre.toLowerCase())) return;
    this.form().get('genres')?.setValue([...this.genres(), genre]);
    this.form().get('genres')?.markAsTouched();
  }
  removeGenre(value: string) {
    this.form().get('genres')?.setValue(this.genres().filter(genre => genre !== value));
    this.form().get('genres')?.markAsTouched();
  }
  invalid(key: string): boolean {
    const control = this.form().get(key);
    return Boolean(control?.touched && control.invalid);
  }
  error(key: string): string {
    const errors = this.form().get(key)?.errors;
    if (errors?.['url']) return 'กรุณาระบุ URL ที่ขึ้นต้นด้วย http:// หรือ https://';
    if (errors?.['min'] || errors?.['pattern']) return 'กรุณาระบุจำนวนเต็มตั้งแต่ 0 ขึ้นไป';
    if (errors?.['maxlength']) return 'ข้อความยาวเกินกำหนด';
    return 'กรุณากรอกข้อมูลช่องนี้';
  }
}
