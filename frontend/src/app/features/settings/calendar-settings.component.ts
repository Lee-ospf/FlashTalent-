import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GoogleCalendarService } from '../../core/services/google-calendar.service';
import { ToastService } from '../../core/services/toast.service';

interface ProviderState {
  loading: boolean;
  connecting: boolean;
  connected: boolean;
}

const INITIAL_STATE: ProviderState = { loading: true, connecting: false, connected: false };

// Settings > Calendar. Lets a Recruiter/Admin link Google Calendar so
// interview scheduling can create/update/cancel matching calendar events and
// check availability. The OAuth callback redirects back here with
// ?connected=true|false&provider=...&email=...&error=..., so this component
// also has to read those query params on load.
@Component({
  selector: 'app-calendar-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">
            <i class="ti ti-calendar-event"></i> Calendar
          </h2>
          <p class="page-sub">
            Connect Google Calendar so interviews you schedule are added to
            your calendar automatically, invites are emailed to the candidate
            and guests, and clashing events are flagged before you book.
          </p>
        </div>
      </div>

      @if (flashMessage) {
        <div
          class="info-banner"
          [class.warn]="!flashSuccess"
          style="margin-bottom:16px"
        >
          <i class="ti" [class.ti-check]="flashSuccess" [class.ti-alert-triangle]="!flashSuccess"></i>
          {{ flashMessage }}
        </div>
      }

      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <mat-card
          class="mat-elevation-z1"
          style="border-radius:12px;max-width:480px;flex:1;min-width:280px"
        >
          <mat-card-content style="padding:20px">
            <div class="card-header">
              <i class="ti ti-brand-google"></i> Google Calendar
            </div>

            @if (google().loading) {
              <div class="empty-state"><mat-spinner diameter="28"></mat-spinner></div>
            } @else if (google().connected) {
              <div
                style="display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--green,#2e7d32)"
              >
                <i class="ti ti-circle-check"></i>
                <span>Connected.</span>
              </div>
              <p class="form-note" style="margin-top:12px">
                To use a different account, reconnect below — this will
                replace the linked account.
              </p>
              <button
                mat-stroked-button
                style="border-radius:8px;margin-top:8px"
                [disabled]="google().connecting"
                (click)="connect()"
              >
                @if (google().connecting) {
                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                }
                <i class="ti ti-refresh"></i> Reconnect
              </button>
            } @else {
              <p class="form-note" style="margin-top:10px">
                Not connected.
              </p>
              <button
                mat-raised-button
                color="primary"
                style="border-radius:8px;margin-top:8px"
                [disabled]="google().connecting"
                (click)="connect()"
              >
                @if (google().connecting) {
                  <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                }
                <i class="ti ti-brand-google"></i> Connect Google Calendar
              </button>
            }
          </mat-card-content>
        </mat-card>
      </div>

      @if (!google().connected && !google().loading) {
        <p class="form-note" style="margin-top:14px">
          Interviews are still scheduled in TalentHub without a calendar
          connection — you just won't get the conflict check or a synced event.
        </p>
      }

      @if (apiError) {
        <div class="api-error" style="margin-top:14px">
          <i class="ti ti-alert-circle"></i> {{ apiError }}
        </div>
      }

      <a routerLink="/settings" class="form-note" style="margin-top:16px;display:inline-flex;cursor:pointer">
        <i class="ti ti-arrow-left"></i> Back to settings
      </a>
    </div>
  `,
})
export class CalendarSettingsComponent implements OnInit {
  private googleService = inject(GoogleCalendarService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  google = signal<ProviderState>(INITIAL_STATE);
  apiError = '';

  flashMessage = '';
  flashSuccess = true;

  ngOnInit(): void {
    this.consumeCallbackParams();
    this.refreshStatus();
  }

  // Reads ?connected=true|false&email=...&error=... left by the OAuth
  // callback, shows a one-time banner, then strips the params from the URL so
  // a refresh doesn't repeat it.
  private consumeCallbackParams(): void {
    const params = this.route.snapshot.queryParamMap;
    if (!params.has('connected')) return;

    const success = params.get('connected') === 'true';
    this.flashSuccess = success;
    this.flashMessage = success
      ? `Connected Google Calendar as ${params.get('email') ?? 'your account'}.`
      : (params.get('error') ?? 'Could not connect Google Calendar.');

    if (success) {
      this.toast.show('Google Calendar connected.', 'success');
    } else {
      this.toast.show(this.flashMessage, 'error');
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  private refreshStatus(): void {
    this.google.update((s) => ({ ...s, loading: true }));
    this.googleService.status().subscribe({
      next: (res) =>
        this.google.set({ loading: false, connecting: false, connected: res.connected }),
      error: (err: Error) => {
        this.apiError = err.message;
        this.google.update((s) => ({ ...s, loading: false }));
      },
    });
  }

  connect(): void {
    this.apiError = '';
    this.google.update((s) => ({ ...s, connecting: true }));
    this.googleService.getConnectUrl().subscribe({
      next: (res) => {
        // Full-page redirect into Google's consent screen; it redirects back
        // to this same page when the user approves/denies.
        window.location.href = res.authUrl;
      },
      error: (err: Error) => {
        this.google.update((s) => ({ ...s, connecting: false }));
        this.apiError = err.message;
      },
    });
  }
}