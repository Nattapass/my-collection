import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-review.component.html',
  styleUrl: './add-review.component.scss'
})
export class AddReviewComponent {
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

  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const category = this.categoryMap[params.get('category') ?? ''] ?? '';
        const isEdit = params.get('mode') === 'edit' && Boolean(category);

        if (!isEdit) {
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

        this.patchFormForCategory(category, editData as Record<string, unknown>);
        if (!this.editFieldValue() && typeof editData['name'] === 'string') {
          this.editFieldValue.set(editData['name']);
        }
      });
  }

  onCategoryChange(value: string) {
    if (this.isEditMode()) {
      return;
    }
    const category = this.categoryMap[value] ?? '';
    this.reviewCategory.set(category);
    this.loadOptionsForCategory(category);
  }

  onBookLicenseOptionChange(value: string) {
    this.setOptionValue(this.reviewBookForm, 'license', value, this.isBookLicenseCustom);
  }

  onAnimeTypeOptionChange(value: string) {
    this.setOptionValue(this.reviewAnimeForm, 'type', value, this.isAnimeTypeCustom);
  }

  onGamePlatFormOptionChange(value: string) {
    this.setOptionValue(this.reviewGameForm, 'platForm', value, this.isGamePlatFormCustom);
  }

  onPlamoLineOptionChange(value: string) {
    this.setOptionValue(this.reviewPlamoForm, 'line', value, this.isPlamoLineCustom);
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
      updateReviewByName: (name, payload) => this.reviewBookService.updateReviewBookByName(name, payload),
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
      updateReviewByName: (name, payload) => this.reviewAnimeService.updateReviewAnimeByName(name, payload),
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
      updateReviewByName: (name, payload) => this.reviewPlamoService.updateReviewPlamoByName(name, payload),
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
      updateReviewByName: (name, payload) => this.reviewGameService.updateReviewGameByName(name, payload),
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

    const request$ = isEdit
      ? options.updateReviewByName(fieldValue, payload)
      : options.createReview(payload);

    this.isSaving.set(true);
    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          const resolved = saved ?? payload;

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
          console.error(error);
          this.isSaving.set(false);
          this.errorMessage.set(
            isEdit
              ? 'Failed to update review. Please try again.'
              : 'Failed to create review. Please try again.'
          );
          Swal.fire({
            icon: 'error',
            title: isEdit ? 'Update Failed' : 'Create Failed',
            text: 'Please try again.',
          });
        }
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
              this.syncCustomMode(this.reviewBookForm, 'license', options, this.isBookLicenseCustom);
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
              this.syncCustomMode(this.reviewAnimeForm, 'type', options, this.isAnimeTypeCustom);
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
              this.syncCustomMode(this.reviewGameForm, 'platForm', options, this.isGamePlatFormCustom);
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
              this.syncCustomMode(this.reviewPlamoForm, 'line', options, this.isPlamoLineCustom);
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
    customSignal: ReturnType<typeof signal<boolean>>
  ) {
    const isCustom = value === '__custom';
    customSignal.set(isCustom);
    form.get(fieldName)?.setValue(isCustom ? '' : value);
  }

  private syncCustomMode(
    form: FormGroup,
    fieldName: string,
    options: string[],
    customSignal: ReturnType<typeof signal<boolean>>
  ) {
    const currentValue = String(form.get(fieldName)?.value ?? '').trim();
    customSignal.set(Boolean(currentValue) && !options.includes(currentValue));
  }

  private createRequiredForm<T extends ReviewInitialValues>(initialValues: T) {
    const controls = Object.entries(initialValues).reduce((acc, [key, value]) => {
      acc[key as keyof T] = new FormControl(value as T[keyof T], {
        nonNullable: true,
        validators: [Validators.required],
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

