import { Component, inject, signal, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationPreferenceService } from '../../core/services/notification-preference.service';

function minLength8(c: { value: string }) {
  return c.value && c.value.length < 8 ? { minLength: true } : null;
}

const REMINDER_TYPES = [
  'PrescreeningReminder',
  'InterviewReminder',
  'OfferResponseReminder',
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-settings"></i> Settings</h2>
          <p class="page-sub">Manage your account</p>
        </div>
      </div>

      <mat-card
        class="mat-elevation-z1"
        style="border-radius:12px;max-width:880px"
      >
        <mat-card-content style="padding:20px">
          <div class="settings-grid">
            <div>
              <div class="card-header">
                <i class="ti ti-user-circle"></i> Account
              </div>
              <div
                style="font-size:13px;color:var(--text-muted);margin-top:6px;margin-bottom:16px"
              >
                {{ user()?.firstName }} {{ user()?.lastName }} ·
                {{ user()?.email }} · {{ user()?.role }}
              </div>

              <div class="form-section-label">
                <i class="ti ti-lock"></i> Change password
              </div>
              @if (user()?.mustChangePassword) {
                <div class="info-banner warn" style="margin-top:10px">
                  <i class="ti ti-alert-triangle"></i>
                  You're using a temporary password. Please set your own below.
                </div>
              }

              <form
                [formGroup]="form"
                (ngSubmit)="submit()"
                style="margin-top:12px"
              >
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Current password</mat-label>
                  <input
                    matInput
                    formControlName="currentPassword"
                    [type]="showCurrent ? 'text' : 'password'"
                    autocomplete="current-password"
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="showCurrent = !showCurrent"
                  >
                    <mat-icon>{{
                      showCurrent ? 'visibility_off' : 'visibility'
                    }}</mat-icon>
                  </button>
                  @if (invalid('currentPassword')) {
                    <mat-error>Required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>New password</mat-label>
                  <input
                    matInput
                    formControlName="newPassword"
                    [type]="showNew ? 'text' : 'password'"
                    autocomplete="new-password"
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="showNew = !showNew"
                  >
                    <mat-icon>{{
                      showNew ? 'visibility_off' : 'visibility'
                    }}</mat-icon>
                  </button>
                  <mat-hint>Minimum 8 characters</mat-hint>
                  @if (
                    form.get('newPassword')?.errors?.['required'] &&
                    form.get('newPassword')?.touched
                  ) {
                    <mat-error>Required</mat-error>
                  }
                  @if (form.get('newPassword')?.errors?.['minLength']) {
                    <mat-error>Must be at least 8 characters</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Confirm new password</mat-label>
                  <input
                    matInput
                    formControlName="confirmPassword"
                    [type]="showNew ? 'text' : 'password'"
                    autocomplete="new-password"
                  />
                  @if (
                    form.errors?.['mismatch'] &&
                    form.get('confirmPassword')?.touched
                  ) {
                    <mat-error>Passwords don't match</mat-error>
                  }
                </mat-form-field>

                @if (apiError) {
                  <div class="api-error" style="margin-bottom:12px">
                    <i class="ti ti-alert-circle"></i> {{ apiError }}
                  </div>
                }

                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  style="border-radius:8px"
                  [disabled]="form.invalid || saving()"
                >
                  @if (saving()) {
                    <mat-spinner
                      diameter="16"
                      style="display:inline-block;margin-right:6px"
                    ></mat-spinner>
                  }
                  <i class="ti ti-check"></i> Update password
                </button>
              </form>
            </div>

            <div class="settings-divider">
              <div class="card-header">
                <i class="ti ti-bell"></i> Notifications
              </div>
              <div
                style="font-size:13px;color:var(--text-muted);margin-top:6px;margin-bottom:16px"
              >
                Choose how you'd like to be notified.
              </div>

              <div class="form-section-label">Notification channel</div>
              <div
                style="font-size:12px;color:var(--text-muted);margin:4px 0 10px"
              >
                Applies to offers, interviews and updates.
              </div>
              <div class="channel-toggle-group">
                <button
                  type="button"
                  class="channel-btn"
                  [class.active]="globalChannel() === 'Email'"
                  [disabled]="prefsSaving()"
                  (click)="setGlobalChannel('Email')"
                >
                  <i class="ti ti-mail"></i> Email
                </button>
                <button
                  type="button"
                  class="channel-btn"
                  [class.active]="globalChannel() === 'InApp'"
                  [disabled]="prefsSaving()"
                  (click)="setGlobalChannel('InApp')"
                >
                  <i class="ti ti-device-mobile"></i> In-app
                </button>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .settings-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 32px;
      }
      .settings-divider {
        border-left: 0.5px solid var(--border);
        padding-left: 32px;
      }
      .channel-toggle-group {
        display: inline-flex;
        border: 0.5px solid var(--border-strong);
        border-radius: 6px;
        overflow: hidden;
      }
      .channel-btn {
        border: none;
        background: transparent;
        padding: 7px 14px;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        color: var(--text-primary);
      }
      .channel-btn.active {
        background: var(--fill-accent, #1565c0);
        color: var(--on-accent, #fff);
      }
      .channel-btn:disabled {
        opacity: 0.6;
        cursor: default;
      }
      @media (max-width: 760px) {
        .settings-grid {
          grid-template-columns: 1fr;
        }
        .settings-divider {
          border-left: none;
          padding-left: 0;
          border-top: 0.5px solid var(--border);
          padding-top: 20px;
          margin-top: 20px;
        }
      }
    `,
  ],
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private notificationPrefs = inject(NotificationPreferenceService);
  @ViewChild(FormGroupDirective) formDirective!: FormGroupDirective;

  user = this.auth.currentUser;
  showCurrent = false;
  showNew = false;
  saving = signal(false);
  apiError = '';

  globalChannel = signal<string>('InApp'); // matches backend's current default until preferences exist
  remindersEnabled = signal(true);
  prefsSaving = signal(false);

  form = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, minLength8]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordsMatch },
  );

  ngOnInit(): void {
    this.notificationPrefs.getMine().subscribe({
      next: (prefs) => {
        const global = prefs.find((p) => p.notificationType === null);
        if (global) this.globalChannel.set(global.channel);

        const reminderOverride = prefs.find(
          (p) =>
            p.notificationType !== null &&
            REMINDER_TYPES.includes(p.notificationType) &&
            p.channel === 'None',
        );
        this.remindersEnabled.set(!reminderOverride);
      },
      error: () =>
        this.toast.show("Couldn't load notification preferences.", 'error'),
    });
  }

  setGlobalChannel(channel: string): void {
    if (channel === this.globalChannel()) return;
    this.prefsSaving.set(true);
    this.notificationPrefs.setPreference(null, channel).subscribe({
      next: () => {
        this.globalChannel.set(channel);
        this.prefsSaving.set(false);
      },
      error: () => {
        this.toast.show("Couldn't update notification channel.", 'error');
        this.prefsSaving.set(false);
      },
    });
  }

  toggleReminders(enabled: boolean): void {
    this.prefsSaving.set(true);
    const calls = enabled
      ? REMINDER_TYPES.map((t) => this.notificationPrefs.deletePreference(t))
      : REMINDER_TYPES.map((t) =>
          this.notificationPrefs.setPreference(t, 'None'),
        );

    let remaining = calls.length;
    let failed = false;
    calls.forEach((call) =>
      call.subscribe({
        next: () => {
          remaining--;
          if (remaining === 0) {
            this.remindersEnabled.set(enabled && !failed);
            this.prefsSaving.set(false);
          }
        },
        error: () => {
          failed = true;
          remaining--;
          if (remaining === 0) {
            this.toast.show("Couldn't update reminder preference.", 'error');
            this.remindersEnabled.set(!enabled); // revert the toggle visually
            this.prefsSaving.set(false);
          }
        },
      }),
    );
  }

  private passwordsMatch(group: any) {
    const a = group.get('newPassword')?.value;
    const b = group.get('confirmPassword')?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.apiError = '';
    this.saving.set(true);
    const v = this.form.value;

    this.auth
      .changePassword({
        currentPassword: v.currentPassword!,
        newPassword: v.newPassword!,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form.reset();
          this.formDirective.resetForm();
          this.toast.show('Password updated.', 'success');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.apiError = err.message;
        },
      });
  }
}
