import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ReviewBook, ReviewBookService } from '../review-book/review-book.service';
import { ReviewAnime, ReviewAnimeService } from '../review-anime/review-anime.service';
import { ReviewPlamo, ReviewPlamoService } from '../review-plamo/review-plamo.service';
import { ReviewGame, ReviewGameService } from '../review-game/review-game.service';

type ReviewCategory = 'review-book' | 'review-anime' | 'review-plamo' | 'review-game' | '';
type ReviewInitialValues = Record<string, string | number>;

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
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  private readonly categoryMap: Record<string, Exclude<ReviewCategory, ''>> = {
    'review-book': 'review-book',
    'review-anime': 'review-anime',
    'review-plamo': 'review-plamo',
    'review-game': 'review-game',
  };
  private readonly scoreFields = ['story', 'character', 'illustration', 'storytelling'] as const;
  private readonly animeScoreFields = ['story', 'art', 'song', 'character', 'storytelling'] as const;
  private readonly plamoScoreFields = ['assembly', 'design', 'joint', 'worth'] as const;
  private readonly gameScoreFields = ['story', 'character', 'ost', 'gameplay', 'graphic'] as const;
  private readonly bookNumericFields = ['total', 'story', 'character', 'illustration', 'storytelling', 'score'] as const;
  private readonly animeNumericFields = ['episode', 'story', 'art', 'song', 'character', 'storytelling', 'Score'] as const;
  private readonly plamoNumericFields = ['assembly', 'design', 'joint', 'worth', 'score'] as const;
  private readonly gameNumericFields = ['story', 'character', 'ost', 'gameplay', 'graphic', 'total'] as const;
  private readonly initialReviewBookFormValue = {
    name: '',
    type: '',
    license: '',
    finishedDate: '',
    total: 0,
    story: 0,
    character: 0,
    illustration: 0,
    storytelling: 0,
    score: 0,
    comment: '',
    image: '',
  };
  private readonly initialReviewAnimeFormValue = {
    name: '',
    'premiered(JP)': '',
    image: '',
    'finished date': '',
    type: '',
    episode: 0,
    story: 0,
    art: 0,
    song: 0,
    character: 0,
    storytelling: 0,
    Score: 0,
    comment: '',
  };
  private readonly initialReviewPlamoFormValue = {
    image: '',
    name: '',
    line: '',
    finishedDate: '',
    assembly: 0,
    design: 0,
    joint: 0,
    worth: 0,
    score: 0,
    comment: '',
  };
  private readonly initialReviewGameFormValue = {
    image: '',
    name: '',
    platForm: '',
    startDate: '',
    endDate: '',
    story: 0,
    character: 0,
    ost: 0,
    gameplay: 0,
    graphic: 0,
    total: 0,
    comment: '',
  };

  readonly reviewBookForm = this.createRequiredForm(this.initialReviewBookFormValue);
  readonly reviewAnimeForm = this.createRequiredForm(this.initialReviewAnimeFormValue);
  readonly reviewPlamoForm = this.createRequiredForm(this.initialReviewPlamoFormValue);
  readonly reviewGameForm = this.createRequiredForm(this.initialReviewGameFormValue);

  constructor(
    private reviewBookService: ReviewBookService,
    private reviewAnimeService: ReviewAnimeService,
    private reviewPlamoService: ReviewPlamoService,
    private reviewGameService: ReviewGameService
  ) {
    this.setupCalculatedAverage(this.reviewBookForm, this.scoreFields, 'score');
    this.setupCalculatedAverage(this.reviewAnimeForm, this.animeScoreFields, 'Score');
    this.setupCalculatedAverage(this.reviewPlamoForm, this.plamoScoreFields, 'score');
    this.setupCalculatedAverage(this.reviewGameForm, this.gameScoreFields, 'total');
  }

  onCategoryChange(value: string) {
    this.reviewCategory.set(this.categoryMap[value] ?? '');
  }

  submitReviewBook() {
    this.submitReview({
      form: this.reviewBookForm,
      mapPayload: () => this.mapPayload<ReviewBook>(this.reviewBookForm, this.bookNumericFields),
      createReview: (payload) => this.reviewBookService.createReviewBook(payload),
      prependReview: (payload) => this.reviewBookService.prependReviewBook(payload),
      resetValue: this.initialReviewBookFormValue,
    });
  }

  submitReviewAnime() {
    this.submitReview({
      form: this.reviewAnimeForm,
      mapPayload: () => this.mapPayload<ReviewAnime>(this.reviewAnimeForm, this.animeNumericFields),
      createReview: (payload) => this.reviewAnimeService.createReviewAnime(payload),
      prependReview: (payload) => this.reviewAnimeService.prependReviewAnime(payload),
      resetValue: this.initialReviewAnimeFormValue,
    });
  }

  submitReviewPlamo() {
    this.submitReview({
      form: this.reviewPlamoForm,
      mapPayload: () => this.mapPayload<ReviewPlamo>(this.reviewPlamoForm, this.plamoNumericFields),
      createReview: (payload) => this.reviewPlamoService.createReviewPlamo(payload),
      prependReview: (payload) => this.reviewPlamoService.prependReviewPlamo(payload),
      resetValue: this.initialReviewPlamoFormValue,
    });
  }

  submitReviewGame() {
    this.submitReview({
      form: this.reviewGameForm,
      mapPayload: () => this.mapPayload<ReviewGame>(this.reviewGameForm, this.gameNumericFields),
      createReview: (payload) => this.reviewGameService.createReviewGame(payload),
      prependReview: (payload) => this.reviewGameService.prependReviewGame(payload),
      resetValue: this.initialReviewGameFormValue,
    });
  }

  private submitReview<T>(options: {
    form: FormGroup;
    mapPayload: () => T;
    createReview: (payload: T) => Observable<T | null | undefined>;
    prependReview: (payload: T) => void;
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
    this.isSaving.set(true);
    options.createReview(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          const resolved = created ?? payload;
          options.prependReview(resolved);
          this.isSaving.set(false);
          this.successMessage.set('Review created successfully.');
          options.form.reset(options.resetValue);
          Swal.fire({
            title: 'Create Success!',
            text: '',
            icon: 'success',
          });
        },
        error: (error) => {
          console.error(error);
          this.isSaving.set(false);
          this.errorMessage.set('Failed to create review. Please try again.');
          Swal.fire({
            icon: 'error',
            title: 'Create Failed',
            text: 'Please try again.',
          });
        }
      });
  }

  private setupCalculatedAverage(form: FormGroup, scoreFields: readonly string[], resultField: string) {
    form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const total = scoreFields.reduce((sum, key) => {
          const controlValue = form.get(key)?.value;
          return sum + this.toNumber(controlValue);
        }, 0);
        const average = total / scoreFields.length;
        const rounded = Number.isFinite(average) ? Number(average.toFixed(2)) : 0;
        form.get(resultField)?.setValue(rounded, { emitEvent: false });
      });
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
}
