import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Swal from 'sweetalert2';
import { ReviewBook, ReviewBookService } from '../review-book/review-book.service';
import { ReviewAnime, ReviewAnimeService } from '../review-anime/review-anime.service';

type ReviewCategory = 'review-book' | 'review-anime';

@Component({
  selector: 'app-add-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-review.component.html',
  styleUrl: './add-review.component.scss'
})
export class AddReviewComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly reviewCategory = signal<ReviewCategory>('review-book');
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  private readonly scoreFields = ['story', 'character', 'illustration', 'storytelling'] as const;
  private readonly animeScoreFields = ['story', 'art', 'song', 'character', 'storytelling'] as const;
  private readonly initialReviewBookFormValue = {
    name: '',
    type: '',
    license: '',
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

  readonly reviewBookForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    license: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    total: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    story: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    character: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    illustration: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    storytelling: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    score: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    comment: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    image: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly reviewAnimeForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    'premiered(JP)': new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    image: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    'finished date': new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    episode: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    story: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    art: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    song: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    character: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    storytelling: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    Score: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    comment: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private reviewBookService: ReviewBookService,
    private reviewAnimeService: ReviewAnimeService
  ) {
    this.setupScoreSync();
    this.setupAnimeScoreSync();
  }

  onCategoryChange(value: string) {
    if (value === 'review-book') {
      this.reviewCategory.set('review-book');
      return;
    }
    if (value === 'review-anime') {
      this.reviewCategory.set('review-anime');
      return;
    }
    this.reviewCategory.set('review-book');
  }

  submitReviewBook() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.reviewBookForm.invalid) {
      this.reviewBookForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    const payload = this.mapReviewBookPayload();
    this.isSaving.set(true);
    this.reviewBookService
      .createReviewBook(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          const resolved = created ?? payload;
          this.reviewBookService.prependReviewBook(resolved);
          this.isSaving.set(false);
          this.successMessage.set('Review created successfully.');
          this.reviewBookForm.reset(this.initialReviewBookFormValue);
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

  submitReviewAnime() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.reviewAnimeForm.invalid) {
      this.reviewAnimeForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    const payload = this.mapReviewAnimePayload();
    this.isSaving.set(true);
    this.reviewAnimeService
      .createReviewAnime(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          const resolved = created ?? payload;
          this.reviewAnimeService.prependReviewAnime(resolved);
          this.isSaving.set(false);
          this.successMessage.set('Review created successfully.');
          this.reviewAnimeForm.reset(this.initialReviewAnimeFormValue);
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

  private mapReviewBookPayload(): ReviewBook {
    const raw = this.reviewBookForm.getRawValue();
    return {
      name: raw.name.trim(),
      type: raw.type.trim(),
      license: raw.license.trim(),
      total: this.toNumber(raw.total),
      story: this.toNumber(raw.story),
      character: this.toNumber(raw.character),
      illustration: this.toNumber(raw.illustration),
      storytelling: this.toNumber(raw.storytelling),
      score: this.toNumber(raw.score),
      comment: raw.comment.trim(),
      image: raw.image.trim(),
    };
  }

  private mapReviewAnimePayload(): ReviewAnime {
    const raw = this.reviewAnimeForm.getRawValue();
    return {
      name: raw.name.trim(),
      'premiered(JP)': raw['premiered(JP)'].trim(),
      image: raw.image.trim(),
      'finished date': raw['finished date'].trim(),
      type: raw.type.trim(),
      episode: this.toNumber(raw.episode),
      story: this.toNumber(raw.story),
      art: this.toNumber(raw.art),
      song: this.toNumber(raw.song),
      character: this.toNumber(raw.character),
      storytelling: this.toNumber(raw.storytelling),
      Score: this.toNumber(raw.Score),
      comment: raw.comment.trim(),
    };
  }

  private setupScoreSync() {
    this.reviewBookForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const total = this.scoreFields.reduce((sum, key) => {
          const controlValue = this.reviewBookForm.controls[key].value;
          return sum + this.toNumber(controlValue);
        }, 0);
        const average = total / this.scoreFields.length;
        const rounded = Number.isFinite(average) ? Number(average.toFixed(2)) : 0;
        this.reviewBookForm.controls.score.setValue(rounded, { emitEvent: false });
      });
  }

  private setupAnimeScoreSync() {
    this.reviewAnimeForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const total = this.animeScoreFields.reduce((sum, key) => {
          const controlValue = this.reviewAnimeForm.controls[key].value;
          return sum + this.toNumber(controlValue);
        }, 0);
        const average = total / this.animeScoreFields.length;
        const rounded = Number.isFinite(average) ? Number(average.toFixed(2)) : 0;
        this.reviewAnimeForm.controls.Score.setValue(rounded, { emitEvent: false });
      });
  }

  private toNumber(value: number | string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
