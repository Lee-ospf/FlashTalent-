import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ErrorStateMatcher } from '@angular/material/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

// Mirrors the backend's RegisterRequest.Password [RegularExpression] exactly —
// min 8 chars, at least one uppercase, one lowercase, one digit, one special
// character. Keeping these in sync avoids the frontend accepting a password
// the backend then rejects with a 400.
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]).{8,}$/;

function strongPassword(c: AbstractControl): ValidationErrors | null {
  return c.value && !STRONG_PASSWORD_PATTERN.test(c.value) ? { weakPassword: true } : null;
}

/** Group-level validator: flags a mismatch on the form itself once both
 *  password fields have something in them. Kept at the group level (rather
 *  than on confirmPassword alone) so it re-evaluates whenever either field
 *  changes, not just confirmPassword. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!password || !confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

/** Material only puts a field into its "error" visual state (red outline +
 *  visible mat-error) based on that field's OWN control errors. Our mismatch
 *  error lives on the parent FormGroup instead, so without this, the
 *  mat-error for it would exist in the DOM but Material would never show it.
 *  This matcher also flags an error state when the parent group has
 *  `passwordMismatch` and the field itself has been interacted with. */
class ConfirmPasswordErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const touched = !!(control && (control.dirty || control.touched));
    const ownError = !!(control && control.invalid);
    const groupMismatch = !!(control?.parent?.hasError('passwordMismatch'));
    return touched && (ownError || groupMismatch);
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-page">
      <!-- Left panel -->
      <div class="auth-left">
        <div class="auth-brand">
          <div class="auth-logo"><i class="ti ti-bolt"></i></div>
          <div>
            <div class="auth-brand-name">FlashTalent</div>
            <div class="auth-brand-sub">Recruitment Portal</div>
          </div>
        </div>

        <div class="auth-tagline">
          <h2>Join thousands of<br>candidates today</h2>
          <p>Create your free account, build your profile, and start applying for opportunities with JordiFlash IT.</p>
        </div>

        <div class="auth-features">
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-user-check"></i></div>
            Build a professional candidate profile
          </div>
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-upload"></i></div>
            Securely upload your CV and certificates
          </div>
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-bell"></i></div>
            Get notified when your status changes
          </div>
        </div>
      </div>

      <!-- Right panel -->
      <div class="auth-right">
        <div class="auth-form-wrap">
          <div class="auth-form-title">Create your account</div>
          <div class="auth-form-sub">Fill in your details to get started</div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="register-form">

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>First name</mat-label>
                <input matInput formControlName="firstName" autocomplete="given-name">
                <mat-error *ngIf="form.get('firstName')?.errors?.['required']">First Name is required.</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Last name</mat-label>
                <input matInput formControlName="lastName" autocomplete="family-name">
                <mat-error *ngIf="form.get('lastName')?.errors?.['required']">Last Name is required.</mat-error>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Email address</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email">
              <mat-icon matPrefix>alternate_email</mat-icon>
              <mat-error *ngIf="form.get('email')?.errors?.['required']">Email is required.</mat-error>
              <mat-error *ngIf="form.get('email')?.errors?.['email']">Invalid email format.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password"
                     [type]="showPwd ? 'text' : 'password'"
                     autocomplete="new-password">
              <mat-icon matPrefix>lock_outline</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="showPwd=!showPwd">
                <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>Min 8 chars: upper, lower, number & symbol</mat-hint>
              <mat-error *ngIf="form.get('password')?.errors?.['required']">Password is required.</mat-error>
              <mat-error *ngIf="form.get('password')?.errors?.['weakPassword']">Needs uppercase, lowercase, a number & a symbol.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Confirm password</mat-label>
              <input matInput formControlName="confirmPassword"
                     [type]="showConfirmPwd ? 'text' : 'password'"
                     [errorStateMatcher]="confirmPasswordMatcher"
                     autocomplete="new-password">
              <mat-icon matPrefix>lock_outline</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="showConfirmPwd=!showConfirmPwd">
                <mat-icon>{{ showConfirmPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('confirmPassword')?.errors?.['required']">Please confirm your password.</mat-error>
              <mat-error *ngIf="!form.get('confirmPassword')?.errors?.['required'] && form.errors?.['passwordMismatch']">
                Passwords do not match.
              </mat-error>
            </mat-form-field>

            <div *ngIf="apiError" class="api-error" style="margin-bottom:16px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>

            <button mat-raised-button color="primary" type="submit"
                    style="width:100%;height:44px;font-size:14px;font-weight:600;border-radius:8px"
                    [disabled]="loading">
              @if (loading) {
                <mat-spinner diameter="20" style="display:inline-block;margin-right:8px"></mat-spinner>
                Creating account…
              } @else {
                <i class="ti ti-user-plus" style="margin-right:6px"></i> Create account
              }
            </button>
          </form>

          <p class="auth-footer">
            Already have an account? <a routerLink="/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-form mat-form-field { display: block; margin-bottom: 12px; }
    .register-form > div { margin-bottom: 0; }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  showPwd = false;
  showConfirmPwd = false;
  loading = false;
  apiError = '';
  confirmPasswordMatcher = new ConfirmPasswordErrorStateMatcher();

  form = this.fb.group({
    firstName:       ['', Validators.required],
    lastName:        ['', Validators.required],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, strongPassword]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordsMatch });

  submit(): void {
    this.form.markAllAsTouched();
    this.apiError = '';
    if (this.form.invalid) return;

    this.loading = true;
    // confirmPassword is intentionally left out of the payload — it's a
    // client-side check only, the backend RegisterRequest doesn't take it.
    const { firstName, lastName, email, password } = this.form.value;
    this.auth.register({ firstName: firstName!, lastName: lastName!, email: email!, password: password! })
      .subscribe({
        next: () => {
          this.loading = false;
          this.toast.show('Account created — please sign in.', 'success');
          this.router.navigate(['/login']);
        },
        error: (err: Error) => { this.loading = false; this.apiError = err.message; }
      });
  }
}