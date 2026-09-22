import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly errorMessage = signal('');

  readonly loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    if (this.busy()) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.getRawValue();
    this.busy.set(true);
    this.errorMessage.set('');
    this.authService.login(username, password).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.router.navigateByUrl('/dashboard'); },
      error: error => this.errorMessage.set(error.status === 401 ? 'Invalid username or password' : error.status === 429 ? 'Too many attempts. Please wait five minutes.' : 'Unable to sign in. Check the backend connection and configuration.')
    });
  }
}
