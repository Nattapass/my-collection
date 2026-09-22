import { GalleryPhoto, UploadContext } from '../shared/review-media.service';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReviewPhotoPickerComponent } from '../shared/review-photo-picker.component';
import { ReviewRankComponent } from '../shared/review-rank.component';
import { GenreColorDirective } from '../../shared/genre-color.directive';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of, defer, from, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ReviewBook, ReviewBookService } from '../review-book/review-book.service';
import { ReviewAnime, ReviewAnimeService } from '../review-anime/review-anime.service';
import { ReviewPlamo, ReviewPlamoService } from '../review-plamo/review-plamo.service';
import { ReviewGame, ReviewGameService } from '../review-game/review-game.service';

type ReviewCategory = 'review-book' | 'review-anime' | 'review-plamo' | 'review-game' | '';
type ReviewInitialValues = Record<string, string | number | string[]>;

@Component({
  selector: 'app-add-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ReviewPhotoPickerComponent, ReviewRankComponent, GenreColorDirective],
  templateUrl: './add-review.component.html',
  styleUrl: './add-review.component.scss'
})
export class AddReviewComponent {
  readonly existingGallery = signal<GalleryPhoto[]>([]);
  readonly photoPicker = viewChild(ReviewPhotoPickerComponent);
  private readonly destroyRef = inject(DestroyRef);
  readonly reviewCategory = signal<ReviewCategory>('');
  readonly mode = signal<'create' | 'edit'>('create');
  readonly isEditMode = computed(() => this.mode() === 'edit');
  readonly pageTitle = computed(() => this.isEditMode() ? 'Edit Review' : 'Add Review');
  readonly pageSubtitle = computed(() =>
    this.isEditMode()
      ? 'Update review details. Category is locked in edit mode.'
      : 'Select a review category and fill in the details.'
  );
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly bookLicenseOptions = signal<string[]>([]);
  readonly animeTypeOptions = signal<string[]>([]);
  readonly gamePlatFormOptions = signal<string[]>([]);
  readonly plamoLineOptions = signal<string[]>([]);
  readonly bookGenreOptions = signal<string[]>([]);
  readonly animeGenreOptions = signal<string[]>([]);
  readonly gameGenreOptions = signal<string[]>([]);
  readonly plamoGenreOptions = signal<string[]>([]);
  readonly tierOptions = ['S', 'A', 'B', 'C', 'D'] as const;
  readonly isBookLicenseCustom = signal(false);
  readonly isAnimeTypeCustom = signal(false);
  readonly isGamePlatFormCustom = signal(false);
  readonly isPlamoLineCustom = signal(false);
  readonly selectedBookLicense = signal('');
  readonly selectedAnimeType = signal('');
  readonly selectedGamePlatForm = signal('');
  readonly selectedPlamoLine = signal('');
  private readonly imageFolder = signal<string | undefined>(undefined);
  private readonly editId = signal('');
  private readonly editFieldName = signal('name');
  private readonly editFieldValue = signal('');
  private readonly categoryMap: Record<string, Exclude<ReviewCategory, ''>> = {
    'review-book': 'review-book',
    'review-anime': 'review-anime',
    'review-plamo': 'review-plamo',
    'review-game': 'review-game',
  };
  private readonly bookNumericFields = ['total'] as const;
  private readonly animeNumericFields = ['episode'] as const;
  private readonly plamoNumericFields = [] as const;
  private readonly gameNumericFields = [] as const;
  private readonly optionalFields = ['comment'] as const;
  private readonly initialReviewBookFormValue = {
    name: '',
    type: '',
    license: '',
    genres: [] as string[],
    tier: '',
    finishedDate: '',
    total: 0,
    comment: '',
    image: '',
  };
  private readonly initialReviewAnimeFormValue = {
    name: '',
    'premiered(JP)': '',
    image: '',
    'finished date': '',
    type: '',
    genres: [] as string[],
    tier: '',
    episode: 0,
    comment: '',
  };
  private readonly initialReviewPlamoFormValue = {
    image: '',
    name: '',
    line: '',
    genres: [] as string[],
    tier: '',
    finishedDate: '',
    comment: '',
  };
  private readonly initialReviewGameFormValue = {
    image: '',
    name: '',
    platForm: '',
    genres: [] as string[],
    tier: '',
    startDate: '',
    endDate: '',
    comment: '',
  };

  readonly reviewBookForm = this.createRequiredForm(this.initialReviewBookFormValue);
  readonly reviewAnimeForm = this.createRequiredForm(this.initialReviewAnimeFormValue);
  readonly reviewPlamoForm = this.createRequiredForm(this.initialReviewPlamoFormValue);
  readonly reviewGameForm = this.createRequiredForm(this.initialReviewGameFormValue);

  constructor(
    private route: ActivatedRoute,
    private reviewBookService: ReviewBookService,
    private reviewAnimeService: ReviewAnimeService,
    private reviewPlamoService: ReviewPlamoService,
    private reviewGameService: ReviewGameService
  ) {}

  activeForm(): FormGroup {
    switch (this.reviewCategory()) {
      case 'review-book': return this.reviewBookForm;
      case 'review-anime': return this.reviewAnimeForm;
      case 'review-game': return this.reviewGameForm;
      default: return this.reviewPlamoForm;
    }
  }

  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const category = this.categoryMap[params.get('category') ?? ''] ?? '';
        const isEdit = params.get('mode') === 'edit' && Boolean(category);

        if (!isEdit) {
          this.existingGallery.set([]);
          this.editId.set('');
          this.imageFolder.set(undefined);
          this.mode.set('create');
          this.reviewCategory.set(category);
          this.loadOptionsForCategory(category);
          this.editFieldName.set('name');
          this.editFieldValue.set('');
          return;
        }

        this.mode.set('edit');
        this.reviewCategory.set(category);
        this.loadOptionsForCategory(category);
        this.editFieldName.set(params.get('fieldName') || 'name');
        this.editFieldValue.set(params.get('fieldValue') || '');

        const stateData = (history.state?.editData ?? null) as Record<string, unknown> | null;
        const fallbackData = this.findCachedReview(category, this.editFieldValue());
        const editData = stateData ?? fallbackData;

        if (!editData) {
          this.errorMessage.set('Edit data not found. Please open edit from the review table.');
          return;
        }

        this.editId.set(String((editData as {_id?: string})._id ?? ''));
        this.imageFolder.set((editData as {imageFolder?: string}).imageFolder);
        this.existingGallery.set((editData as {gallery?: GalleryPhoto[]}).gallery ?? []);
        this.patchFormForCategory(category, editData as Record<string, unknown>);
        this.syncCustomModesForCategory(category);
        if (!this.editFieldValue() && typeof editData['name'] === 'string') {
          this.editFieldValue.set(editData['name']);
        }
      });
  }

  onCategoryChange(value: string) {
    if (this.isEditMode() || this.isSaving()) {
      return;
    }
    const category = this.categoryMap[value] ?? '';
    this.existingGallery.set([]);
    this.imageFolder.set(undefined);
    this.reviewCategory.set(category);
    this.loadOptionsForCategory(category);
  }

  onBookLicenseOptionChange(value: string) {
    this.setOptionValue(
      this.reviewBookForm,
      'license',
      value,
      this.isBookLicenseCustom,
      this.selectedBookLicense
    );
  }

  onAnimeTypeOptionChange(value: string) {
    this.setOptionValue(
      this.reviewAnimeForm,
      'type',
      value,
      this.isAnimeTypeCustom,
      this.selectedAnimeType
    );
  }

  onGamePlatFormOptionChange(value: string) {
    this.setOptionValue(
      this.reviewGameForm,
      'platForm',
      value,
      this.isGamePlatFormCustom,
      this.selectedGamePlatForm
    );
  }

  onPlamoLineOptionChange(value: string) {
    this.setOptionValue(
      this.reviewPlamoForm,
      'line',
      value,
      this.isPlamoLineCustom,
      this.selectedPlamoLine
    );
  }

  addGenre(form: FormGroup, value: string) {
    const genre = value.trim();
    if (!genre) {
      return;
    }
    const current = this.getGenres(form);
    if (current.some((item) => item.toLowerCase() === genre.toLowerCase())) {
      return;
    }
    form.get('genres')?.setValue([...current, genre]);
    form.get('genres')?.markAsTouched();
  }

  removeGenre(form: FormGroup, value: string) {
    const next = this.getGenres(form).filter((item) => item !== value);
    form.get('genres')?.setValue(next);
    form.get('genres')?.markAsTouched();
  }

  getGenres(form: FormGroup) {
    const value = form.get('genres')?.value;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      : [];
  }

  dateInputValue(form: FormGroup, fieldName: string) {
    return this.toDateInputValue(form.get(fieldName)?.value);
  }

  onDateChange(form: FormGroup, fieldName: string, value: string) {
    const control = form.get(fieldName);
    control?.setValue(this.formatDateInputValue(value));
    control?.markAsTouched();
  }

  submitLabel() {
    return this.isEditMode() ? 'Update Review' : 'Create Review';
  }

  savingLabel() {
    return this.isEditMode() ? 'Updating...' : 'Saving...';
  }

  submitReviewBook() {
    this.submitReview({
      form: this.reviewBookForm,
      mapPayload: () => this.mapPayload<ReviewBook>(this.reviewBookForm, this.bookNumericFields),
      createReview: (payload) => this.reviewBookService.createReviewBook(payload),
      updateReviewByName: (name, payload) => this.reviewBookService.updateReviewBookByName(name, payload, this.editId()),
      prependReview: (payload) => this.reviewBookService.prependReviewBook(payload),
      replaceReviewByName: (name, payload) => this.reviewBookService.replaceReviewBookByName(name, payload),
      resetValue: this.initialReviewBookFormValue,
    });
  }

  submitReviewAnime() {
    this.submitReview({
      form: this.reviewAnimeForm,
      mapPayload: () => this.mapPayload<ReviewAnime>(this.reviewAnimeForm, this.animeNumericFields),
      createReview: (payload) => this.reviewAnimeService.createReviewAnime(payload),
      updateReviewByName: (name, payload) => this.reviewAnimeService.updateReviewAnimeByName(name, payload, this.editId()),
      prependReview: (payload) => this.reviewAnimeService.prependReviewAnime(payload),
      replaceReviewByName: (name, payload) => this.reviewAnimeService.replaceReviewAnimeByName(name, payload),
      resetValue: this.initialReviewAnimeFormValue,
    });
  }

  submitReviewPlamo() {
    this.submitReview({
      form: this.reviewPlamoForm,
      mapPayload: () => this.mapPayload<ReviewPlamo>(this.reviewPlamoForm, this.plamoNumericFields),
      createReview: (payload) => this.reviewPlamoService.createReviewPlamo(payload),
      updateReviewByName: (name, payload) => this.reviewPlamoService.updateReviewPlamoByName(name, payload, this.editId()),
      prependReview: (payload) => this.reviewPlamoService.prependReviewPlamo(payload),
      replaceReviewByName: (name, payload) => this.reviewPlamoService.replaceReviewPlamoByName(name, payload),
      resetValue: this.initialReviewPlamoFormValue,
    });
  }

  submitReviewGame() {
    this.submitReview({
      form: this.reviewGameForm,
      mapPayload: () => this.mapPayload<ReviewGame>(this.reviewGameForm, this.gameNumericFields),
      createReview: (payload) => this.reviewGameService.createReviewGame(payload),
      updateReviewByName: (name, payload) => this.reviewGameService.updateReviewGameByName(name, payload, this.editId()),
      prependReview: (payload) => this.reviewGameService.prependReviewGame(payload),
      replaceReviewByName: (name, payload) => this.reviewGameService.replaceReviewGameByName(name, payload),
      resetValue: this.initialReviewGameFormValue,
    });
  }

  private submitReview<T extends { name?: string }>(options: {
    form: FormGroup;
    mapPayload: () => T;
    createReview: (payload: T) => Observable<T | null | undefined>;
    updateReviewByName: (name: string, payload: T) => Observable<T | null | undefined>;
    prependReview: (payload: T) => void;
    replaceReviewByName: (name: string, payload: T) => void;
    resetValue: unknown;
  }) {
    if (this.isSaving() || this.photoPicker()?.busy()) return;
    this.errorMessage.set('');
    this.successMessage.set('');

    if (options.form.invalid) {
      options.form.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    const payload = options.mapPayload();
    const isEdit = this.isEditMode();
    const fieldValue = this.editFieldValue().trim();

    if (isEdit && !fieldValue) {
      this.errorMessage.set('Cannot update because the edit key is missing.');
      return;
    }

    const proceedWithRequest = () => {
      const context: UploadContext = { category: this.reviewCategory().replace('review-', ''), reviewName: String(payload.name ?? ''), folder: this.imageFolder() };
      const request$ = defer(() => from((this.photoPicker()?.prepare(context) ?? Promise.resolve([]))
        .finally(() => this.imageFolder.set(context.folder)))).pipe(
        switchMap(gallery => {
          const withPhotos = { ...payload, gallery, imageFolder: context.folder };
          return isEdit ? options.updateReviewByName(fieldValue, withPhotos) : options.createReview(withPhotos);
        })
      );

      this.isSaving.set(true);
      request$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (saved) => {
            const resolved = saved ?? payload;

            this.photoPicker()?.saved();
            if (isEdit) {
              options.replaceReviewByName(fieldValue, resolved);
              const latestName = String(resolved.name ?? fieldValue).trim();
              this.editFieldValue.set(latestName || fieldValue);
              this.successMessage.set('Review updated successfully.');
              Swal.fire({
                title: 'Update Success!',
                text: '',
                icon: 'success',
              });
            } else {
              options.prependReview(resolved);
              options.form.reset(options.resetValue);
              this.photoPicker()?.clear();
              this.imageFolder.set(undefined);
              this.syncCustomModesForCategory(this.reviewCategory() as Exclude<ReviewCategory, ''>);
              this.successMessage.set('Review created successfully.');
              Swal.fire({
                title: 'Create Success!',
                text: '',
                icon: 'success',
              });
            }

            this.isSaving.set(false);
          },
          error: (error) => {
            this.isSaving.set(false);
            this.errorMessage.set(error?.status === 401
              ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ก่อนบันทึก'
              : 'บันทึกไม่สำเร็จ กรุณาตรวจการเชื่อมต่อ รูปที่เลือกยังอยู่และกดบันทึกเพื่อลองใหม่ได้');
            Swal.fire({
              icon: 'error',
              title: isEdit ? 'Update Failed' : 'Create Failed',
              text: this.errorMessage(),
            });
          }
        });
    };

    if (isEdit) {
      proceedWithRequest();
      return;
    }

    const reviewName = this.normalizeReviewName(String(payload.name ?? '').trim());
    if (!reviewName) {
      proceedWithRequest();
      return;
    }

    const reviewType = this.reviewCategory() === 'review-book'
      ? this.normalizeReviewName(String((payload as { type?: string }).type ?? '').trim())
      : '';

    this.isSaving.set(true);
    this.checkDuplicateReviewName(this.reviewCategory(), reviewName, reviewType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isDuplicate) => {
          if (isDuplicate) {
            this.isSaving.set(false);
            this.errorMessage.set(
              this.reviewCategory() === 'review-book'
                ? `A book review named "${payload.name}" with the same type already exists.`
                : `A review named "${payload.name}" already exists in this category.`
            );
            return;
          }
          proceedWithRequest();
        },
        error: (error) => {
          console.error(error);
          this.isSaving.set(false);
          this.errorMessage.set('Unable to verify whether this review already exists. Please try again.');
        },
      });
  }

  private patchFormForCategory(category: Exclude<ReviewCategory, ''>, data: Record<string, unknown>) {
    switch (category) {
      case 'review-book':
        this.reviewBookForm.patchValue(data as Partial<typeof this.initialReviewBookFormValue>);
        break;
      case 'review-anime':
        this.reviewAnimeForm.patchValue(data as Partial<typeof this.initialReviewAnimeFormValue>);
        break;
      case 'review-plamo':
        this.reviewPlamoForm.patchValue(data as Partial<typeof this.initialReviewPlamoFormValue>);
        break;
      case 'review-game':
        this.reviewGameForm.patchValue(data as Partial<typeof this.initialReviewGameFormValue>);
        break;
    }
  }

  private syncCustomModesForCategory(category: Exclude<ReviewCategory, ''>) {
    switch (category) {
      case 'review-book':
        this.syncCustomMode(
          this.reviewBookForm,
          'license',
          this.bookLicenseOptions(),
          this.isBookLicenseCustom,
          this.selectedBookLicense
        );
        break;
      case 'review-anime':
        this.syncCustomMode(
          this.reviewAnimeForm,
          'type',
          this.animeTypeOptions(),
          this.isAnimeTypeCustom,
          this.selectedAnimeType
        );
        break;
      case 'review-game':
        this.syncCustomMode(
          this.reviewGameForm,
          'platForm',
          this.gamePlatFormOptions(),
          this.isGamePlatFormCustom,
          this.selectedGamePlatForm
        );
        break;
      case 'review-plamo':
        this.syncCustomMode(
          this.reviewPlamoForm,
          'line',
          this.plamoLineOptions(),
          this.isPlamoLineCustom,
          this.selectedPlamoLine
        );
        break;
    }
  }

  private findCachedReview(category: Exclude<ReviewCategory, ''>, name: string) {
    const key = name.trim();
    if (!key) {
      return null;
    }

    switch (category) {
      case 'review-book':
        return this.reviewBookService.reviewBooks().find((item) => item.name === key) ?? null;
      case 'review-anime':
        return this.reviewAnimeService.reviewAnime().find((item) => item.name === key) ?? null;
      case 'review-plamo':
        return this.reviewPlamoService.reviewPlamos().find((item) => item.name === key) ?? null;
      case 'review-game':
        return this.reviewGameService.reviewGames().find((item) => item.name === key) ?? null;
      default:
        return null;
    }
  }

  private checkDuplicateReviewName(category: ReviewCategory, reviewName: string, reviewType = ''): Observable<boolean> {
    const normalizedName = this.normalizeReviewName(reviewName);
    const normalizedType = this.normalizeReviewName(reviewType);
    if (!normalizedName || !category) {
      return of(false);
    }

    switch (category) {
      case 'review-book':
        return this.reviewBookService.getAllReviews().pipe(
          map((reviews) => reviews.some((item) => {
            const sameName = this.normalizeReviewName(item.name) === normalizedName;
            const sameType = !normalizedType || this.normalizeReviewName(item.type) === normalizedType;
            return sameName && sameType;
          }))
        );
      case 'review-anime':
        return this.reviewAnimeService.getAllReviews().pipe(
          map((reviews) => reviews.some((item) => this.normalizeReviewName(item.name) === normalizedName))
        );
      case 'review-plamo':
        return this.reviewPlamoService.getAllReviews().pipe(
          map((reviews) => reviews.some((item) => this.normalizeReviewName(item.name) === normalizedName))
        );
      case 'review-game':
        return this.reviewGameService.getAllReviews().pipe(
          map((reviews) => reviews.some((item) => this.normalizeReviewName(item.name) === normalizedName))
        );
      default:
        return of(false);
    }
  }

  private normalizeReviewName(value: string) {
    return value.trim().toLowerCase();
  }

  private loadOptionsForCategory(category: ReviewCategory) {
    switch (category) {
      case 'review-book':
        this.reviewBookService
          .getGenres()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (genres) => this.bookGenreOptions.set(genres ?? []),
            error: (error) => console.error(error),
          });
        this.reviewBookService
          .getLicenses()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (licenses) => {
              const options = licenses ?? [];
              this.bookLicenseOptions.set(options);
              this.syncCustomMode(
                this.reviewBookForm,
                'license',
                options,
                this.isBookLicenseCustom,
                this.selectedBookLicense
              );
            },
            error: (error) => console.error(error),
          });
        break;
      case 'review-anime':
        this.reviewAnimeService
          .getGenres()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (genres) => this.animeGenreOptions.set(genres ?? []),
            error: (error) => console.error(error),
          });
        this.reviewAnimeService
          .getTypes()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (types) => {
              const options = types ?? [];
              this.animeTypeOptions.set(options);
              this.syncCustomMode(
                this.reviewAnimeForm,
                'type',
                options,
                this.isAnimeTypeCustom,
                this.selectedAnimeType
              );
            },
            error: (error) => console.error(error),
          });
        break;
      case 'review-game':
        this.reviewGameService
          .getGenres()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (genres) => this.gameGenreOptions.set(genres ?? []),
            error: (error) => console.error(error),
          });
        this.reviewGameService
          .getPlatForms()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (platForms) => {
              const options = platForms ?? [];
              this.gamePlatFormOptions.set(options);
              this.syncCustomMode(
                this.reviewGameForm,
                'platForm',
                options,
                this.isGamePlatFormCustom,
                this.selectedGamePlatForm
              );
            },
            error: (error) => console.error(error),
          });
        break;
      case 'review-plamo':
        this.reviewPlamoService
          .getGenres()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (genres) => this.plamoGenreOptions.set(genres ?? []),
            error: (error) => console.error(error),
          });
        this.reviewPlamoService
          .getLines()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (lines) => {
              const options = lines ?? [];
              this.plamoLineOptions.set(options);
              this.syncCustomMode(
                this.reviewPlamoForm,
                'line',
                options,
                this.isPlamoLineCustom,
                this.selectedPlamoLine
              );
            },
            error: (error) => console.error(error),
          });
        break;
    }
  }

  private setOptionValue(
    form: FormGroup,
    fieldName: string,
    value: string,
    customSignal: ReturnType<typeof signal<boolean>>,
    selectedValue: ReturnType<typeof signal<string>>
  ) {
    const isCustom = value === '__custom';
    selectedValue.set(value);
    customSignal.set(isCustom);
    form.get(fieldName)?.setValue(isCustom ? '' : value);
  }

  private syncCustomMode(
    form: FormGroup,
    fieldName: string,
    options: string[],
    customSignal: ReturnType<typeof signal<boolean>>,
    selectedValue: ReturnType<typeof signal<string>>
  ) {
    const currentValue = String(form.get(fieldName)?.value ?? '').trim();
    if (!currentValue) {
      customSignal.set(false);
      selectedValue.set('');
      return;
    }

    const matchedOption = options.find((option) => option.trim() === currentValue);
    if (matchedOption) {
      customSignal.set(false);
      selectedValue.set(matchedOption);
      if (form.get(fieldName)?.value !== matchedOption) {
        form.get(fieldName)?.setValue(matchedOption, { emitEvent: false });
      }
      return;
    }

    customSignal.set(true);
    selectedValue.set('__custom');
  }

  private createRequiredForm<T extends ReviewInitialValues>(initialValues: T) {
    const controls = Object.entries(initialValues).reduce((acc, [key, value]) => {
      acc[key as keyof T] = new FormControl(value as T[keyof T], {
        nonNullable: true,
        validators: this.optionalFields.includes(key as (typeof this.optionalFields)[number])
          ? []
          : [Validators.required],
      });
      return acc;
    }, {} as { [K in keyof T]: FormControl<T[K]> });

    return new FormGroup(controls);
  }

  private mapPayload<T>(form: FormGroup, numericFields: readonly string[]): T {
    const numericFieldSet = new Set(numericFields);
    const raw = form.getRawValue() as Record<string, unknown>;

    return Object.entries(raw).reduce((acc, [key, value]) => {
      if (numericFieldSet.has(key)) {
        acc[key] = this.toNumber(value as number | string | null | undefined);
      } else if (typeof value === 'string') {
        acc[key] = value.trim();
      } else if (Array.isArray(value)) {
        acc[key] = Array.from(
          new Set(
            value
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
          )
        );
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>) as T;
  }

  private toNumber(value: number | string | null | undefined) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toDateInputValue(value: unknown) {
    if (typeof value !== 'string' || !value.trim()) {
      return '';
    }

    const trimmed = value.trim();
    const dateInputMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateInputMatch) {
      return trimmed;
    }

    const displayMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!displayMatch) {
      return '';
    }

    const [, day, month, year] = displayMatch;
    return `${year}-${month}-${day}`;
  }

  private formatDateInputValue(value: string) {
    if (!value) {
      return '';
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return value;
    }

    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
}
