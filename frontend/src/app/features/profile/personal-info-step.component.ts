import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { CandidateService } from '../../core/services/candidate.service';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { ToastService } from '../../core/services/toast.service';
import { DatePickerTriggerDirective } from '../../shared/directives/date-picker-trigger.directive';

@Component({
  selector: 'app-personal-info-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    DatePickerTriggerDirective,
  ],
  template: `
    <div [class.page-container]="!embedded" [class.step-body-padded]="embedded">
      @if (!embedded) {
        <div class="page-header">
          <div>
            <h2 class="page-title">
              <i class="ti ti-user"></i> Personal information
            </h2>
            <p class="page-sub">
              Basic details recruiters will see on your profile
            </p>
          </div>
        </div>
      }

      <mat-card class="mat-elevation-z1" style="border-radius:12px">
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label">
            <i class="ti ti-user"></i> Personal information
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field-grid">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Phone number</mat-label>
                <input
                  matInput
                  formControlName="phone"
                  type="tel"
                  placeholder="+27 XX XXX XXXX"
                />
                @if (isInvalid('phone')) {
                  <mat-error
                    >Enter a valid phone number, e.g. +27 82 123 4567</mat-error
                  >
                }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Date of birth</mat-label>
                <input
                  matInput
                  formControlName="dateOfBirth"
                  type="date"
                  [max]="maxDob"
                />
                @if (isInvalid('dateOfBirth')) {
                  <mat-error>Date of birth can't be in the future</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Gender</mat-label>
                <mat-select formControlName="gender">
                  <mat-option value="">Select…</mat-option>
                  <mat-option value="Male">Male</mat-option>
                  <mat-option value="Female">Female</mat-option>
                  <mat-option value="Non-binary">Non-binary</mat-option>
                  <mat-option value="Prefer not to say"
                    >Prefer not to say</mat-option
                  >
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Nationality</mat-label>
                <input
                  matInput
                  formControlName="nationality"
                  placeholder="e.g. South African"
                />
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Race (EE reporting)</mat-label>
                <mat-select formControlName="race">
                  <mat-option value="">Select…</mat-option>
                  <mat-option value="African">African</mat-option>
                  <mat-option value="Coloured">Coloured</mat-option>
                  <mat-option value="Indian/Asian">Indian/Asian</mat-option>
                  <mat-option value="White">White</mat-option>
                  <mat-option value="Prefer not to say"
                    >Prefer not to say</mat-option
                  >
                </mat-select>
              </mat-form-field>
            </div>

            @if (apiError) {
              <div class="api-error" style="margin-top:12px">
                <i class="ti ti-alert-circle"></i> {{ apiError }}
              </div>
            }

            @if (!hideSubmit) {
              <div class="form-footer" style="margin-top:14px">
                <span></span>
                <button
                  type="submit"
                  mat-raised-button
                  color="primary"
                  style="border-radius:8px"
                  [disabled]="loading || form.invalid"
                >
                  @if (loading) {
                    <mat-spinner
                      diameter="16"
                      style="display:inline-block;margin-right:6px"
                    ></mat-spinner>
                  }
                  {{
                    loading
                      ? 'Saving…'
                      : hasProfile()
                        ? 'Save changes'
                        : 'Save and continue'
                  }}
                </button>
              </div>
            }
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .step-body-padded {
        padding: 1.5rem;
      }
    `,
  ],
})
export class PersonalInfoStepComponent implements OnInit {
  @Input() embedded = false;
  /** When true, hides the form's own submit button — used inside the setup
   *  wizard, where the footer's "Save and continue" button drives submit()
   *  directly instead. Left false (button visible) for the edit-in-place
   *  summary view, which has no footer of its own. */
  @Input() hideSubmit = false;
  @Output() saved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private candidateService = inject(CandidateService);
  state = inject(CandidateStateService);
  private toast = inject(ToastService);

  loading = false;
  apiError = '';
  maxDob = new Date().toISOString().substring(0, 10);

  form = this.fb.group({
    phone: ['', [Validators.pattern(/^\+?[0-9\s-]{7,15}$/)]],
    gender: [''],
    race: [''],
    nationality: [''],
    dateOfBirth: ['', [this.notFutureDate]],
  });

  hasProfile(): boolean {
    return !!this.state.profile();
  }

  ngOnInit(): void {
    const p = this.state.profile();
    if (p) {
      this.form.patchValue({
        phone: p.phone ?? '',
        gender: p.gender ?? '',
        race: p.race ?? '',
        nationality: p.nationality ?? '',
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.substring(0, 10) : '',
      });
    }
  }

  private notFutureDate(control: { value: string }) {
    if (!control.value) return null;
    return new Date(control.value) > new Date() ? { futureDate: true } : null;
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.apiError = '';
    const v = this.form.value;
    const payload = {
      phone: v.phone || undefined,
      gender: v.gender || undefined,
      race: v.race || undefined,
      nationality: v.nationality || undefined,
      dateOfBirth: v.dateOfBirth
        ? new Date(v.dateOfBirth).toISOString()
        : undefined,
    };

    this.loading = true;

    if (this.hasProfile()) {
      this.candidateService
        .update(this.state.profile()!.candidateId, payload)
        .subscribe({
          next: (updated) => {
            this.state.setProfile(updated);
            this.loading = false;
            this.toast.show('Profile updated.', 'success');
            this.saved.emit();
          },
          error: (err: Error) => {
            this.loading = false;
            this.apiError = err.message;
          },
        });
    } else {
      const userId = this.auth.currentUser()!.userId;
      this.candidateService.create({ userId, ...payload }).subscribe({
        next: (created) => {
          this.state.setProfile(created);
          this.loading = false;
          this.toast.show(
            `Profile created — Candidate #${created.candidateId}`,
            'success',
          );
          this.saved.emit();
        },
        error: (err: Error) => {
          this.loading = false;
          this.apiError = err.message;
        },
      });
    }
  }
}
