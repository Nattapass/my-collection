import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, defer, finalize, forkJoin, from, map, of, switchMap, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { ReviewPhotoPickerComponent } from '../shared/review-photo-picker.component';
import { ReviewRankComponent } from '../shared/review-rank.component';
import { GalleryPhoto, UploadContext } from '../shared/review-media.service';
import { ReviewFormFieldsComponent } from './review-form-fields.component';
import { createEditorForm, editorPayload, initialValues, REVIEW_EDITORS, reviewCategory, ReviewCategory } from './review-editor.config';
import { ReviewDocument, ReviewEditorDataService } from './review-editor-data.service';

@Component({
  selector: 'app-add-review',
  imports: [ReactiveFormsModule, RouterLink, ReviewPhotoPickerComponent, ReviewRankComponent, ReviewFormFieldsComponent],
  templateUrl: './add-review.component.html',
  styleUrl: './add-review.component.scss',
})
export class AddReviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(ReviewEditorDataService);
  private readonly destroyRef = inject(DestroyRef);
  readonly photoPicker = viewChild(ReviewPhotoPickerComponent);
  readonly formFields = viewChild(ReviewFormFieldsComponent);
  readonly categories = Object.values(REVIEW_EDITORS);
  readonly reviewCategory = signal<ReviewCategory | ''>('');
  readonly config = computed(() => { const category = this.reviewCategory(); return category ? REVIEW_EDITORS[category] : null; });
  readonly isEditMode = signal(false);
  readonly isSaving = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly optionsMessage = signal('');
  readonly successMessage = signal('');
  readonly choices = signal<string[]>([]);
  readonly genreOptions = signal<string[]>([]);
  readonly existingGallery = signal<GalleryPhoto[]>([]);
  readonly activeForm = signal<FormGroup>(new FormGroup({}));
  private readonly drafts = new Map<ReviewCategory, FormGroup>();
  private editId = '';
  private editName = '';
  private imageFolder?: string;
  private editReady = false;

  ngOnInit() {
    this.route.queryParamMap.pipe(
      switchMap(params => {
        this.photoPicker()?.clear();
        this.existingGallery.set([]);
        this.errorMessage.set('');
        this.optionsMessage.set('');
        this.successMessage.set('');
        this.choices.set([]);
        this.genreOptions.set([]);
        this.editId = '';
        this.editName = '';
        this.imageFolder = undefined;
        this.editReady = false;
        const category = reviewCategory(params.get('category'));
        const editing = params.get('mode') === 'edit';
        this.reviewCategory.set(category);
        this.isEditMode.set(editing);
        if (!category) { this.isLoading.set(false); return of(null); }
        const config = REVIEW_EDITORS[category];
        const form = editing ? createEditorForm(config) : this.drafts.get(category) ?? createEditorForm(config);
        if (!editing) this.drafts.set(category, form);
        this.activeForm.set(form);
        this.formFields()?.customFields.set({});
        this.isLoading.set(true);
        const api = this.data.categories[category];
        const field = params.get('fieldName') || 'name';
        const key = params.get('fieldValue') || '';
        const matches = (review: ReviewDocument) => field === '_id' ? review._id === key : review.name === key;
        const state = typeof history === 'undefined' ? null : history.state?.editData as ReviewDocument | undefined;
        const cached = state && matches(state) ? state : api.cached().find(matches);
        const record$ = !editing ? of(null) : !key || !['name', '_id'].includes(field)
          ? throwError(() => new Error('Invalid edit link.'))
          : cached ? of(cached) : api.all().pipe(map(reviews => reviews.find(matches) ?? null));
        const options = (request: ReturnType<typeof api.choices>) => request.pipe(catchError(() => {
          this.optionsMessage.set('โหลดตัวเลือกไม่สำเร็จ สามารถเลือกเพิ่มค่าใหม่และกรอกเองได้');
          return of([] as string[]);
        }));
        return forkJoin({ genres: options(api.genres()), choices: options(api.choices()), record: record$ }).pipe(
          map(result => ({ ...result, editing })),
          catchError(() => { this.errorMessage.set('โหลดรีวิวไม่สำเร็จ กรุณากลับหน้ารวมแล้วเปิดแก้ไขใหม่'); return of(null); }),
          finalize(() => this.isLoading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      if (!result) return;
      this.choices.set(result.choices);
      this.genreOptions.set(result.genres);
      if (result.editing) {
        if (!result.record) { this.errorMessage.set('ไม่พบรีวิวที่ต้องการแก้ไข'); return; }
        this.activeForm().patchValue(result.record);
        this.editId = result.record._id ?? '';
        this.editName = result.record.name;
        this.imageFolder = result.record.imageFolder;
        this.existingGallery.set(result.record.gallery ?? []);
        this.editReady = true;
      }
    });
  }

  onCategoryChange(value: string) {
    if (this.isEditMode() || this.isSaving() || this.photoPicker()?.busy()) return;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { category: reviewCategory(value) || null } });
  }

  submit() {
    const category = this.reviewCategory();
    if (!category || this.isSaving() || this.isLoading() || this.photoPicker()?.busy() || (this.isEditMode() && !this.editReady)) return;
    const form = this.activeForm();
    this.errorMessage.set('');
    this.successMessage.set('');
    if (form.invalid) { form.markAllAsTouched(); this.errorMessage.set('กรุณาตรวจสอบข้อมูลที่ระบุ'); return; }
    const api = this.data.categories[category];
    const payload = editorPayload(form) as unknown as ReviewDocument;
    const editing = this.isEditMode();
    const normalize = (value: string = '') => value.trim().toLowerCase();
    const duplicate$ = editing ? of(false) : api.all().pipe(map(reviews => reviews.some(review =>
      normalize(review.name) === normalize(payload.name) && (category !== 'review-book' || normalize(review.type) === normalize(payload.type)))));
    const context: UploadContext = { category: category.replace('review-', ''), reviewName: payload.name, folder: this.imageFolder };
    this.isSaving.set(true);
    duplicate$.pipe(
      switchMap(duplicate => {
        if (duplicate) return throwError(() => new Error(category === 'review-book' ? 'มีรีวิวชื่อและประเภทหนังสือนี้อยู่แล้ว' : 'มีรีวิวชื่อเรื่องนี้อยู่แล้ว'));
        return defer(() => from((this.photoPicker()?.prepare(context) ?? Promise.resolve(this.existingGallery()))
          .finally(() => { this.imageFolder = context.folder; })));
      }),
      switchMap(gallery => {
        const withPhotos = { ...payload, gallery, imageFolder: context.folder };
        return editing ? api.update(this.editName, withPhotos, this.editId) : api.create(withPhotos);
      }),
      finalize(() => this.isSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: saved => {
        this.photoPicker()?.saved();
        if (editing) {
          api.replace(this.editName, saved);
          this.editName = saved.name;
          this.editId = saved._id ?? this.editId;
          // Keep reload/deep links valid after renaming the review.
          if (typeof history !== 'undefined') {
            const url = this.router.createUrlTree([], { relativeTo: this.route, queryParams: {
              mode: 'edit', category, fieldName: this.editId ? '_id' : 'name', fieldValue: this.editId || this.editName,
            } });
            history.replaceState({ ...history.state, editData: saved }, '', this.router.serializeUrl(url));
          }
        } else {
          api.prepend(saved);
          form.reset(initialValues(REVIEW_EDITORS[category]));
          this.formFields()?.customFields.set({});
          this.photoPicker()?.clear();
          this.imageFolder = undefined;
        }
        this.successMessage.set(editing ? 'แก้ไขรีวิวเรียบร้อยแล้ว' : 'เพิ่มรีวิวเรียบร้อยแล้ว');
        void Swal.fire({ title: this.successMessage(), icon: 'success' });
      },
      error: error => {
        this.errorMessage.set(error?.status === 401 ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ก่อนบันทึก'
          : error instanceof Error && !('status' in error) ? error.message
          : 'บันทึกไม่สำเร็จ กรุณาตรวจข้อมูลและการเชื่อมต่อ รูปที่เลือกยังอยู่เพื่อให้ลองใหม่ได้');
      },
    });
  }
}
