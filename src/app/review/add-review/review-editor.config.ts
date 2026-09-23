import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

export type ReviewCategory = 'review-anime' | 'review-book' | 'review-game' | 'review-plamo';
export interface EditorField {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'date' | 'select' | 'choice' | 'genres' | 'textarea' | 'url';
  options?: readonly string[];
  optional?: boolean;
  wide?: boolean;
}
export interface EditorConfig { category: ReviewCategory; label: string; fields: readonly EditorField[]; }
const name: EditorField = { key: 'name', label: 'ชื่อเรื่อง', kind: 'text' };
const tier: EditorField = { key: 'tier', label: 'Tier', kind: 'select', options: ['S', 'A', 'B', 'C', 'D'] };
const common: EditorField[] = [
  { key: 'genres', label: 'แนวเรื่อง / แท็ก', kind: 'genres', wide: true },
  { key: 'image', label: 'URL รูปหน้าปก', kind: 'url', wide: true },
  { key: 'comment', label: 'ความคิดเห็น', kind: 'textarea', optional: true, wide: true },
];
export const REVIEW_EDITORS: Record<ReviewCategory, EditorConfig> = {
  'review-anime': { category: 'review-anime', label: 'Anime', fields: [name,
    { key: 'type', label: 'ประเภทอนิเมะ', kind: 'choice' }, tier,
    { key: 'episode', label: 'จำนวนตอน', kind: 'number' },
    { key: 'premiered(JP)', label: 'วันฉาย', kind: 'date' },
    { key: 'finished date', label: 'วันที่ดูจบ', kind: 'date' }, ...common] },
  'review-book': { category: 'review-book', label: 'Books', fields: [name,
    { key: 'type', label: 'ประเภทหนังสือ', kind: 'select', options: ['Manga', 'LightNovel'] },
    { key: 'license', label: 'สำนักพิมพ์', kind: 'choice' }, tier,
    { key: 'total', label: 'จำนวนเล่ม', kind: 'number' },
    { key: 'finishedDate', label: 'วันที่อ่านจบ', kind: 'date' }, ...common] },
  'review-game': { category: 'review-game', label: 'Game', fields: [name,
    { key: 'platForm', label: 'แพลตฟอร์ม', kind: 'choice' }, tier,
    { key: 'startDate', label: 'วันที่เริ่ม', kind: 'date' },
    { key: 'endDate', label: 'วันที่เล่นจบ', kind: 'date' }, ...common] },
  'review-plamo': { category: 'review-plamo', label: 'Plamo', fields: [name,
    { key: 'line', label: 'ไลน์', kind: 'choice' }, tier,
    { key: 'finishedDate', label: 'วันที่ต่อเสร็จ', kind: 'date' }, ...common] },
};
export function reviewCategory(value: string | null): ReviewCategory | '' {
  return value && Object.hasOwn(REVIEW_EDITORS, value) ? value as ReviewCategory : '';
}
export function initialValues(config: EditorConfig): Record<string, string | number | string[]> {
  return Object.fromEntries(config.fields.map(field => [field.key, field.kind === 'number' ? 0 : field.kind === 'genres' ? [] : '']));
}
const nonBlank: ValidatorFn = control => typeof control.value === 'string' && !control.value.trim() ? { required: true } : null;
const httpUrl: ValidatorFn = control => {
  try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; }
  catch { return { url: true }; }
};
export function createEditorForm(config: EditorConfig): FormGroup {
  const defaults = initialValues(config);
  return new FormGroup(Object.fromEntries(config.fields.map(field => {
    const validators = field.optional ? [] : [Validators.required, nonBlank];
    if (field.kind === 'number') validators.push(Validators.min(0), Validators.pattern(/^\d+$/));
    if (field.kind === 'url') validators.push(httpUrl);
    if (field.kind === 'url') validators.push(Validators.maxLength(8192));
    if (field.key === 'name') validators.push(Validators.maxLength(1000));
    if (field.kind === 'genres') validators.push(Validators.maxLength(100));
    if (field.kind === 'choice' || field.kind === 'date') validators.push(Validators.maxLength(200));
    if (field.kind === 'textarea') validators.push(Validators.maxLength(50000));
    return [field.key, new FormControl(defaults[field.key], { nonNullable: true, validators })];
  })));
}
export function editorPayload(form: FormGroup): Record<string, unknown> {
  return Object.fromEntries(Object.entries(form.getRawValue()).map(([key, value]) => [key,
    typeof value === 'string' ? value.trim() : Array.isArray(value) ? [...new Set(value.map(item => String(item).trim()).filter(Boolean))] : value]));
}
export function dateInputValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}
export function displayDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
