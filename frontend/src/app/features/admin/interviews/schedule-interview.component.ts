import {
  Component,
  inject,
  signal,
  computed,
  Signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, Location } from '@angular/common';
import {
  FormBuilder,
  FormArray,
  FormControl,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Observable,
  combineLatest,
  concat,
  of,
  map,
  startWith,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import {
  InterviewService,
  CalendarConflictError,
} from '../../../core/services/interview.service';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  ApplicationResponse,
  InterviewResponse,
  InterviewType,
  InterviewCategory,
  InterviewRescheduleResponse,
  CalendarConflictDto,
} from '../../../core/models';

// Result of a proactive (non-blocking) calendar availability check
// for a candidate date/time on the schedule or reschedule form.
interface AvailabilityCheckState {
  checking: boolean;
  conflicts: CalendarConflictDto[] | null;
}
const NO_AVAILABILITY_WARNING: AvailabilityCheckState = {
  checking: false,
  conflicts: null,
};

type ViewMode = 'schedule' | 'view' | 'reschedule' | 'outcome' | 'decision';

const MAX_INTERVIEW_ROUNDS = 5;
@Component({
  selector: 'app-schedule-interview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],

  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">
            <i class="ti ti-calendar-event"></i>
            @if (mode() === 'view') {
              Interview details
            } @else if (mode() === 'reschedule') {
              Reschedule interview
            } @else if (mode() === 'outcome') {
              Record interview outcome
            } @else {
              Schedule interview
            }
          </h2>
          <p class="page-sub">
            @if (existingInterview()) {
              Round {{ existingInterview()!.roundNumber }}
            } @else if (nextRound()) {
              Round {{ nextRound() }}
            } @else {
              Schedule a new round
            }
          </p>
        </div>
      </div>

      @if (apiError) {
        <div class="api-error" style="margin-bottom:14px">
          <i class="ti ti-alert-circle"></i> {{ apiError }}
        </div>
      }

      @if (calendarConflicts().length) {
        <div class="info-banner warn" style="margin-bottom:14px">
          <i class="ti ti-alert-triangle"></i>
          <div>
            <div>{{ calendarConflictMessage() }}</div>
            <ul style="margin:6px 0 10px 18px">
              @for (c of calendarConflicts(); track c.conflictStart) {
                <li>
                  {{ formatDateTime(c.conflictStart) }} –
                  {{ formatDateTime(c.conflictEnd) }}
                </li>
              }
            </ul>
            <div style="display:flex;gap:10px">
              <button
                mat-stroked-button
                type="button"
                style="border-radius:8px"
                (click)="dismissCalendarConflicts()"
              >
                Pick a different time
              </button>
              <button
                mat-raised-button
                color="warn"
                type="button"
                style="border-radius:8px"
                (click)="scheduleAnyway()"
              >
                Schedule anyway
              </button>
            </div>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (mode() === 'view' && existingInterview()) {
        <!-- VIEW: existing scheduled interview -->
        <mat-card
          class="mat-elevation-z1"
          style="border-radius:12px;margin-bottom:16px"
        >
          <mat-card-content style="padding:20px 24px">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Name</mat-label>
              <input
                matInput
                [value]="existingInterview()!.candidateName"
                disabled
              />
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Job title</mat-label>
              <input
                matInput
                [value]="existingInterview()!.vacancyTitle"
                disabled
              />
            </mat-form-field>

            <mat-divider style="margin:8px 0 20px"></mat-divider>

            <div class="field-grid">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Interview category</mat-label>
                <input
                  matInput
                  [value]="
                    categoryLabel(existingInterview()!.interviewCategory)
                  "
                  disabled
                />
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Interview type</mat-label>
                <input
                  matInput
                  [value]="typeLabel(existingInterview()!.interviewType)"
                  disabled
                />
              </mat-form-field>
            </div>

            @if (existingInterview()!.location) {
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Location</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.location"
                  disabled
                />
              </mat-form-field>
            }
            @if (existingInterview()!.meetingLink) {
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Meeting link</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.meetingLink"
                  disabled
                />
              </mat-form-field>
            }
            @if (existingInterview()!.guestEmails.length) {
              <div class="form-note" style="align-items:flex-start;gap:8px;margin-bottom:12px">
                <i class="ti ti-users" style="margin-top:2px"></i>
                <span>
                  Guests:
                  {{ existingInterview()!.guestEmails.join(', ') }}
                </span>
              </div>
            }

            <mat-divider style="margin:8px 0 16px"></mat-divider>
            <div class="form-note" style="align-items:center;gap:8px">
              <i
                class="ti"
                [class.ti-calendar-check]="
                  existingInterview()!.calendarIntegrationStatus ===
                    'Created' ||
                  existingInterview()!.calendarIntegrationStatus === 'Updated'
                "
                [class.ti-calendar-x]="
                  existingInterview()!.calendarIntegrationStatus ===
                  'Cancelled'
                "
                [class.ti-alert-circle]="
                  existingInterview()!.calendarIntegrationStatus === 'Failed'
                "
                [class.ti-calendar-off]="
                  existingInterview()!.calendarIntegrationStatus ===
                  'NotIntegrated'
                "
              ></i>
              <span>{{
                calendarStatusLabel(
                  existingInterview()!.calendarIntegrationStatus,
                  existingInterview()!.calendarProvider
                )
              }}</span>
              @if (existingInterview()!.calendarIntegrationStatus === 'Failed') {
                <button
                  mat-stroked-button
                  type="button"
                  style="border-radius:8px;margin-left:8px"
                  [disabled]="syncingCalendar()"
                  (click)="retryCalendarSync()"
                >
                  @if (syncingCalendar()) {
                    <mat-spinner
                      diameter="14"
                      style="display:inline-block;margin-right:6px"
                    ></mat-spinner>
                  }
                  Retry sync
                </button>
              }
            </div>

            @if (lastReschedule()) {
              <mat-divider style="margin:16px 0 20px"></mat-divider>
              <div class="form-note" style="align-items:flex-start;gap:8px">
                <i class="ti ti-history" style="margin-top:2px"></i>
                <span>
                  Last rescheduled from
                  {{ formatDateTime(lastReschedule()!.oldScheduledAt) }} to
                  {{ formatDateTime(lastReschedule()!.newScheduledAt) }}
                  by {{ lastReschedule()!.changedByName }} — "{{
                    lastReschedule()!.reason
                  }}"
                </span>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <div class="form-footer">
          <a (click)="goBack()" class="form-note" style="cursor:pointer">
            <i class="ti ti-arrow-left"></i> Back
          </a>
          <div style="display:flex;gap:10px">
            @if (!interviewHasStarted()) {
              <button
                mat-stroked-button
                color="warn"
                style="border-radius:8px"
                [disabled]="cancelling()"
                (click)="cancelInterview()"
              >
                @if (cancelling()) {
                  <mat-spinner
                    diameter="16"
                    style="display:inline-block;margin-right:6px"
                  ></mat-spinner>
                }
                <i class="ti ti-x"></i> Cancel interview
              </button>
            }
            @if (interviewHasStarted()) {
              <button
                mat-stroked-button
                style="border-radius:8px"
                (click)="startOutcome()"
              >
                <i class="ti ti-clipboard-check"></i> Record outcome
              </button>
            }
            @if (!interviewHasStarted()) {
              <button
                mat-raised-button
                color="primary"
                style="border-radius:8px"
                (click)="startReschedule()"
              >
                <i class="ti ti-calendar-repeat"></i> Reschedule
              </button>
            }
          </div>
        </div>
      } @else if (mode() === 'reschedule' && existingInterview()) {
        <!-- RESCHEDULE: editable form for existing interview -->
        <form [formGroup]="rescheduleForm" (ngSubmit)="saveReschedule()">
          <mat-card
            class="mat-elevation-z1"
            style="border-radius:12px;margin-bottom:16px"
          >
            <mat-card-content style="padding:20px 24px">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.candidateName"
                  disabled
                />
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Job title</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.vacancyTitle"
                  disabled
                />
              </mat-form-field>

              <mat-divider style="margin:8px 0 20px"></mat-divider>

              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Interview category</mat-label>
                  <input
                    matInput
                    [value]="
                      categoryLabel(existingInterview()!.interviewCategory)
                    "
                    disabled
                  />
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Interview type</mat-label>
                  <mat-select formControlName="interviewType">
                    <mat-option value="InPerson">In person</mat-option>
                    <mat-option value="Virtual">Virtual</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              @if (rescheduleForm.value.interviewType === 'InPerson') {
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Location</mat-label>
                  <input
                    matInput
                    formControlName="location"
                    placeholder="e.g. Head office, 3rd floor boardroom"
                  />
                  @if (rescheduleInvalid('location')) {
                    <mat-error
                      >Location is required for an in-person
                      interview</mat-error
                    >
                  }
                </mat-form-field>
              } @else if (rescheduleForm.value.interviewType === 'Virtual') {
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Meeting link</mat-label>
                  <input
                    matInput
                    formControlName="meetingLink"
                    placeholder="e.g. https://meet.google.com/..."
                  />
                  @if (rescheduleInvalid('meetingLink')) {
                    <mat-error
                      >Meeting link is required for a virtual
                      interview</mat-error
                    >
                  }
                </mat-form-field>
              }
              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Date</mat-label>
                  <input
                    matInput
                    type="date"
                    formControlName="scheduledDate"
                    [min]="minDate"
                    #dateInput
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="openPicker(dateInput)"
                    tabindex="-1"
                  >
                    <i class="ti ti-calendar"></i>
                  </button>
                  @if (rescheduleInvalid('scheduledDate')) {
                    <mat-error>A future date is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Time</mat-label>
                  <input
                    matInput
                    type="time"
                    formControlName="scheduledTime"
                    #timeInput
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="openPicker(timeInput)"
                    tabindex="-1"
                  >
                    <i class="ti ti-clock"></i>
                  </button>
                  @if (rescheduleInvalid('scheduledTime')) {
                    <mat-error>Time is required</mat-error>
                  }
                </mat-form-field>
              </div>
              @if (rescheduleForm.errors?.['pastDateTime']) {
                <p class="form-note" style="color:var(--warn,#c62828)">
                  <i class="ti ti-alert-circle"></i> The selected date and time
                  must be in the future
                </p>
              }
              @if (rescheduleAvailability().checking) {
                <p class="form-note">
                  <mat-spinner diameter="14" style="display:inline-block;margin-right:6px"></mat-spinner>
                  Checking your calendar…
                </p>
              } @else if (rescheduleAvailability().conflicts) {
                <p class="form-note" style="color:var(--warn,#c62828)">
                  <i class="ti ti-alert-triangle"></i> This clashes with an
                  event on your calendar.
                </p>
              }

              <mat-divider style="margin:16px 0"></mat-divider>
              <div formArrayName="guestEmails">
                <p class="form-note" style="margin-bottom:8px">
                  <i class="ti ti-users"></i> Additional guests (optional)
                </p>
                @for (
                  guestCtrl of rescheduleGuestEmailForms.controls;
                  track guestCtrl;
                  let i = $index
                ) {
                  <div style="display:flex;gap:8px;align-items:flex-start">
                    <mat-form-field appearance="outline" style="flex:1">
                      <mat-label>Guest email</mat-label>
                      <input
                        matInput
                        type="email"
                        [formControlName]="i"
                        placeholder="e.g. hiring.manager@company.com"
                      />
                      @if (guestCtrl.invalid && (guestCtrl.dirty || guestCtrl.touched)) {
                        <mat-error>Enter a valid email address</mat-error>
                      }
                    </mat-form-field>
                    <button
                      mat-icon-button
                      type="button"
                      style="margin-top:6px"
                      (click)="removeRescheduleGuestEmail(i)"
                      aria-label="Remove guest"
                    >
                      <i class="ti ti-x"></i>
                    </button>
                  </div>
                }
                <button
                  mat-stroked-button
                  type="button"
                  style="border-radius:8px;margin-bottom:16px"
                  (click)="addRescheduleGuestEmail()"
                >
                  <i class="ti ti-plus"></i> Add guest
                </button>
              </div>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Reason for rescheduling</mat-label>
                <textarea
                  matInput
                  formControlName="rescheduleReason"
                  rows="3"
                  placeholder="e.g. Candidate requested a later time due to a conflict"
                ></textarea>
                @if (rescheduleInvalid('rescheduleReason')) {
                  <mat-error>A reason is required when rescheduling</mat-error>
                }
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          @if (apiError && rescheduleForm.dirty) {
            <div class="api-error" style="margin-bottom:14px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>
          }

          <div class="form-footer">
            <a
              (click)="cancelRescheduleEdit()"
              class="form-note"
              style="cursor:pointer"
            >
              <i class="ti ti-arrow-left"></i> Back
            </a>
            <button
              type="submit"
              mat-raised-button
              color="primary"
              style="border-radius:8px"
              [disabled]="rescheduleForm.invalid || saving()"
            >
              @if (saving()) {
                <mat-spinner
                  diameter="16"
                  style="display:inline-block;margin-right:6px"
                ></mat-spinner>
              }
              <i class="ti ti-calendar-repeat"></i> Save new time
            </button>
          </div>
        </form>
      } @else if (mode() === 'outcome' && existingInterview()) {
        <!-- OUTCOME: record Passed/Failed for the existing interview -->
        <form [formGroup]="outcomeForm" (ngSubmit)="saveOutcome()">
          <mat-card
            class="mat-elevation-z1"
            style="border-radius:12px;margin-bottom:16px"
          >
            <mat-card-content style="padding:20px 24px">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Round</mat-label>
                <input
                  matInput
                  [value]="
                    'Round ' +
                    existingInterview()!.roundNumber +
                    ' — ' +
                    categoryLabel(existingInterview()!.interviewCategory) +
                    ' — ' +
                    formatDateTime(existingInterview()!.scheduledAt)
                  "
                  disabled
                />
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.candidateName"
                  disabled
                />
              </mat-form-field>

              <mat-divider style="margin:8px 0 20px"></mat-divider>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Outcome</mat-label>
                <mat-select formControlName="outcome">
                  <mat-option value="Passed">Passed</mat-option>
                  <mat-option value="Failed">Failed</mat-option>
                </mat-select>
                @if (outcomeInvalid('outcome')) {
                  <mat-error>Select an outcome</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Recruiter notes (optional)</mat-label>
                <textarea
                  matInput
                  formControlName="recruiterNotes"
                  rows="4"
                  placeholder="Any notes on how the interview went…"
                ></textarea>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          @if (apiError && outcomeForm.dirty) {
            <div class="api-error" style="margin-bottom:14px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>
          }

          <div class="form-footer">
            <a
              (click)="cancelOutcomeEdit()"
              class="form-note"
              style="cursor:pointer"
            >
              <i class="ti ti-arrow-left"></i> Back
            </a>
            <button
              type="submit"
              mat-raised-button
              color="primary"
              style="border-radius:8px"
              [disabled]="outcomeForm.invalid || saving()"
            >
              @if (saving()) {
                <mat-spinner
                  diameter="16"
                  style="display:inline-block;margin-right:6px"
                ></mat-spinner>
              }
              <i class="ti ti-clipboard-check"></i> Save outcome
            </button>
          </div>
        </form>
      } @else if (mode() === 'decision' && existingInterview()) {
        <!-- DECISION: candidate passed — choose next step -->
        <mat-card
          class="mat-elevation-z1"
          style="border-radius:12px;margin-bottom:16px"
        >
          <mat-card-content style="padding:24px;text-align:center">
            <i
              class="ti ti-circle-check"
              style="font-size:40px;color:var(--green);margin-bottom:12px;display:block"
            ></i>
            <h3 style="margin-bottom:6px">
              {{ existingInterview()!.candidateName }} passed Round
              {{ existingInterview()!.roundNumber }}
            </h3>
            <p
              class="form-note"
              style="justify-content:center;margin-bottom:20px"
            >
              What would you like to do next?
            </p>
            <div style="display:flex;gap:12px;justify-content:center">
              @if (canScheduleNextRound()) {
                <button
                  mat-stroked-button
                  style="border-radius:8px"
                  (click)="scheduleNextRound()"
                >
                  <i class="ti ti-calendar-plus"></i> Schedule Next Round
                </button>
              }
              <button
                mat-raised-button
                color="primary"
                style="border-radius:8px"
                (click)="extendOffer()"
              >
                <i class="ti ti-mail"></i> Extend Offer
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <!-- SCHEDULE: no existing interview, create a new one -->
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-card
            class="mat-elevation-z1"
            style="border-radius:12px;margin-bottom:16px"
          >
            <mat-card-content style="padding:20px 24px">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  [value]="application()?.candidateName"
                  disabled
                />
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Job title</mat-label>
                <input
                  matInput
                  [value]="application()?.vacancyTitle"
                  disabled
                />
              </mat-form-field>

              <mat-divider style="margin:8px 0 20px"></mat-divider>
              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Interview category</mat-label>
                  <mat-select formControlName="interviewCategory">
                    <mat-option value="Technical">Technical</mat-option>
                    <mat-option value="Behavioral">Behavioral</mat-option>
                    <mat-option value="Panel">Panel</mat-option>
                    <mat-option value="Managerial">Managerial</mat-option>
                  </mat-select>
                  @if (invalid('interviewCategory')) {
                    <mat-error>Interview category is required</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Interview type</mat-label>
                  <mat-select formControlName="interviewType">
                    <mat-option value="InPerson">In person</mat-option>
                    <mat-option value="Virtual">Virtual</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              @if (form.value.interviewType === 'InPerson') {
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Location</mat-label>
                  <input
                    matInput
                    formControlName="location"
                    placeholder="e.g. Head office, 3rd floor boardroom"
                  />
                  @if (invalid('location')) {
                    <mat-error
                      >Location is required for an in-person
                      interview</mat-error
                    >
                  }
                </mat-form-field>
              } @else if (form.value.interviewType === 'Virtual') {
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Meeting link</mat-label>
                  <input
                    matInput
                    formControlName="meetingLink"
                    placeholder="e.g. https://meet.google.com/..."
                  />
                  @if (invalid('meetingLink')) {
                    <mat-error
                      >Meeting link is required for a virtual
                      interview</mat-error
                    >
                  }
                </mat-form-field>
              }
              @if (lastReschedule()) {
                <mat-divider style="margin:8px 0 20px"></mat-divider>
                <div class="form-note" style="align-items:flex-start;gap:8px">
                  <i class="ti ti-history" style="margin-top:2px"></i>
                  <span>
                    Last rescheduled from
                    {{ formatDateTime(lastReschedule()!.oldScheduledAt) }} to
                    {{ formatDateTime(lastReschedule()!.newScheduledAt) }}
                    by {{ lastReschedule()!.changedByName }} — "{{
                      lastReschedule()!.reason
                    }}"
                  </span>
                </div>
              }

              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Date</mat-label>
                  <input
                    matInput
                    type="date"
                    formControlName="scheduledDate"
                    [min]="minDate"
                    #dateInput
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="openPicker(dateInput)"
                    tabindex="-1"
                  >
                    <i class="ti ti-calendar"></i>
                  </button>
                  @if (invalid('scheduledDate')) {
                    <mat-error>A future date is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Time</mat-label>
                  <input
                    matInput
                    type="time"
                    formControlName="scheduledTime"
                    #timeInput
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="openPicker(timeInput)"
                    tabindex="-1"
                  >
                    <i class="ti ti-clock"></i>
                  </button>
                  @if (invalid('scheduledTime')) {
                    <mat-error>Time is required</mat-error>
                  }
                </mat-form-field>
              </div>
              @if (form.errors?.['pastDateTime']) {
                <p class="form-note" style="color:var(--warn,#c62828)">
                  <i class="ti ti-alert-circle"></i> The selected date and time
                  must be in the future
                </p>
              }
              @if (scheduleAvailability().checking) {
                <p class="form-note">
                  <mat-spinner diameter="14" style="display:inline-block;margin-right:6px"></mat-spinner>
                  Checking your calendar…
                </p>
              } @else if (scheduleAvailability().conflicts) {
                <p class="form-note" style="color:var(--warn,#c62828)">
                  <i class="ti ti-alert-triangle"></i> This clashes with an
                  event on your calendar.
                </p>
              }

              <mat-divider style="margin:8px 0 20px"></mat-divider>

              <div formArrayName="guestEmails">
                <p class="form-note" style="margin-bottom:8px">
                  <i class="ti ti-users"></i> Additional guests (optional)
                </p>
                @for (
                  guestCtrl of guestEmailForms.controls;
                  track guestCtrl;
                  let i = $index
                ) {
                  <div style="display:flex;gap:8px;align-items:flex-start">
                    <mat-form-field appearance="outline" style="flex:1">
                      <mat-label>Guest email</mat-label>
                      <input
                        matInput
                        type="email"
                        [formControlName]="i"
                        placeholder="e.g. hiring.manager@company.com"
                      />
                      @if (guestCtrl.invalid && (guestCtrl.dirty || guestCtrl.touched)) {
                        <mat-error>Enter a valid email address</mat-error>
                      }
                    </mat-form-field>
                    <button
                      mat-icon-button
                      type="button"
                      style="margin-top:6px"
                      (click)="removeGuestEmail(i)"
                      aria-label="Remove guest"
                    >
                      <i class="ti ti-x"></i>
                    </button>
                  </div>
                }
                <button
                  mat-stroked-button
                  type="button"
                  style="border-radius:8px;margin-bottom:16px"
                  (click)="addGuestEmail()"
                >
                  <i class="ti ti-plus"></i> Add guest
                </button>
              </div>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Scheduled by</mat-label>
                <input matInput [value]="scheduledByName()" disabled />
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          @if (apiError && form.dirty) {
            <div class="api-error" style="margin-bottom:14px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>
          }

          <div class="form-footer">
            <a (click)="goBack()" class="form-note" style="cursor:pointer">
              <i class="ti ti-arrow-left"></i> Back
            </a>
            <button
              type="submit"
              mat-raised-button
              color="primary"
              style="border-radius:8px"
              [disabled]="form.invalid || saving()"
            >
              @if (saving()) {
                <mat-spinner
                  diameter="16"
                  style="display:inline-block;margin-right:6px"
                ></mat-spinner>
              }
              <i class="ti ti-calendar-plus"></i> Schedule interview
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class ScheduleInterviewComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private interviewService = inject(InterviewService);
  private appService = inject(ApplicationService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private now = signal(Date.now());
  private clockHandle?: ReturnType<typeof setInterval>;
  private location = inject(Location);

  applicationId!: number;
  application = signal<ApplicationResponse | null>(null);
  existingInterview = signal<InterviewResponse | null>(null);
  mode = signal<ViewMode>('schedule');
  nextRound = signal<number | null>(null);
  loading = signal(true);
  saving = signal(false);
  cancelling = signal(false);
  apiError = '';
  maxRounds = MAX_INTERVIEW_ROUNDS;
  lastReschedule = signal<InterviewRescheduleResponse | null>(null);
  minDate = new Date().toISOString().substring(0, 10);

  // Calendar conflict handling: when schedule()/saveReschedule() gets
  // a 409, we stash the conflicting windows here and offer "Schedule anyway",
  // which resubmits the same form with ignoreCalendarConflicts: true.
  calendarConflicts = signal<CalendarConflictDto[]>([]);
  calendarConflictMessage = signal('');
  private pendingIgnoreConflicts = false;
  syncingCalendar = signal(false);

  form = this.fb.group(
    {
      interviewType: ['InPerson' as InterviewType, Validators.required],
      interviewCategory: ['' as InterviewCategory | '', Validators.required],
      scheduledDate: ['', Validators.required],
      scheduledTime: ['', Validators.required],
      location: [''],
      meetingLink: [''],
      guestEmails: this.fb.array<FormControl<string>>([]),
    },
    { validators: this.futureDateTime },
  );

  rescheduleForm = this.fb.group(
    {
      interviewType: ['InPerson' as InterviewType, Validators.required],
      scheduledDate: ['', Validators.required],
      scheduledTime: ['', Validators.required],
      location: [''],
      meetingLink: [''],
      guestEmails: this.fb.array<FormControl<string>>([]),
      rescheduleReason: ['', [Validators.required, Validators.minLength(5)]],
    },
    { validators: this.futureDateTime },
  );

  // The organizer (the recruiter scheduling/rescheduling) can invite extra
  // guests - e.g. a hiring manager or a co-interviewer - beyond themselves
  // and the candidate, who are always added automatically.
  get guestEmailForms(): FormArray<FormControl<string>> {
    return this.form.get('guestEmails') as FormArray<FormControl<string>>;
  }
  get rescheduleGuestEmailForms(): FormArray<FormControl<string>> {
    return this.rescheduleForm.get('guestEmails') as FormArray<
      FormControl<string>
    >;
  }

  addGuestEmail(): void {
    this.guestEmailForms.push(
      this.fb.control('', { nonNullable: true, validators: [Validators.email] }),
    );
  }
  removeGuestEmail(index: number): void {
    this.guestEmailForms.removeAt(index);
  }
  addRescheduleGuestEmail(): void {
    this.rescheduleGuestEmailForms.push(
      this.fb.control('', { nonNullable: true, validators: [Validators.email] }),
    );
  }
  removeRescheduleGuestEmail(index: number): void {
    this.rescheduleGuestEmailForms.removeAt(index);
  }
  private setGuestEmails(array: FormArray<FormControl<string>>, emails: string[]): void {
    array.clear();
    for (const email of emails) {
      array.push(
        this.fb.control(email, { nonNullable: true, validators: [Validators.email] }),
      );
    }
  }
  // Non-empty, trimmed guest emails ready to send to the API.
  private collectGuestEmails(array: FormArray<FormControl<string>>): string[] {
    return array.value.map((e) => e.trim()).filter((e) => e.length > 0);
  }

  outcomeForm = this.fb.group({
    outcome: ['' as '' | 'Passed' | 'Failed', Validators.required],
    recruiterNotes: [''],
  });

  // Proactive, non-blocking calendar availability check. Each of
  // these is a single derived signal built from the form's own date/time
  // controls - no manual subscribe/unsubscribe, no separate "checking" and
  // "warning" state to keep in sync, and toSignal() ties its lifetime to
  // this component automatically. The hard check still happens on submit
  // (see CalendarConflictError handling in save()/saveReschedule()).
  scheduleAvailability = this.buildAvailabilitySignal(
    this.form.get('scheduledDate')!,
    this.form.get('scheduledTime')!,
  );
  rescheduleAvailability = this.buildAvailabilitySignal(
    this.rescheduleForm.get('scheduledDate')!,
    this.rescheduleForm.get('scheduledTime')!,
  );

  interviewHasStarted = computed(() => {
    const iv = this.existingInterview();
    if (!iv) return false;
    return new Date(iv.scheduledAt).getTime() <= this.now();
  });

  private futureDateTime(group: any) {
    const date = group.get('scheduledDate')?.value;
    const time = group.get('scheduledTime')?.value;
    if (!date || !time) return null;
    return new Date(`${date}T${time}`) <= new Date()
      ? { pastDateTime: true }
      : null;
  }
  private loadRescheduleHistory(interviewId: number): void {
    this.interviewService.getRescheduleHistory(interviewId).subscribe({
      next: (history) => {
        this.lastReschedule.set(
          history.length ? history[history.length - 1] : null,
        );
      },
      error: () => {
        // Non-critical — don't surface an apiError banner for this, just leave the note absent
        this.lastReschedule.set(null);
      },
    });
  }
  openPicker(input: HTMLInputElement): void {
    if (typeof (input as any).showPicker === 'function') {
      (input as any).showPicker();
    } else {
      input.focus();
    }
  }

  scheduledByName(): string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : '';
  }

  typeLabel(type: string): string {
    return type === 'InPerson' ? 'In person' : 'Virtual';
  }
  categoryLabel(category: string): string {
    return category; // enum values already read naturally: Technical, Behavioral, Panel, Managerial
  }
  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    if (!c) return false;
    if (field === 'location')
      return (
        this.form.value.interviewType === 'InPerson' &&
        !this.form.value.location &&
        (c.dirty || c.touched)
      );
    if (field === 'meetingLink')
      return (
        this.form.value.interviewType === 'Virtual' &&
        !this.form.value.meetingLink &&
        (c.dirty || c.touched)
      );
    return c.invalid && (c.dirty || c.touched);
  }

  rescheduleInvalid(field: string): boolean {
    const c = this.rescheduleForm.get(field);
    if (!c) return false;
    const type = this.rescheduleForm.value.interviewType;
    if (field === 'location')
      return (
        type === 'InPerson' &&
        !this.rescheduleForm.value.location &&
        (c.dirty || c.touched)
      );
    if (field === 'meetingLink')
      return (
        type === 'Virtual' &&
        !this.rescheduleForm.value.meetingLink &&
        (c.dirty || c.touched)
      );
    return c.invalid && (c.dirty || c.touched);
  }

  outcomeInvalid(field: string): boolean {
    const c = this.outcomeForm.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void {
    this.clockHandle = setInterval(() => this.now.set(Date.now()), 30_000);
    this.applicationId = Number(this.route.snapshot.paramMap.get('id'));

    this.appService.getById(this.applicationId).subscribe({
      next: (a) => this.application.set(a),
      error: (err: Error) => (this.apiError = err.message),
    });

    this.interviewService.getByApplication(this.applicationId).subscribe({
      next: (interviews) => {
        this.nextRound.set(interviews.length + 1);
        const active = interviews.find((i) => i.status === 'Scheduled');
        if (active) {
          this.existingInterview.set(active);
          this.mode.set('view');
          this.loadRescheduleHistory(active.interviewId);
        }
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.apiError = err.message;
        this.loading.set(false);
      },
    });
  }

  // Builds a signal that tracks a form's scheduledDate/scheduledTime
  // controls and reports whether that moment clashes with the recruiter's
  // connected calendar - purely as a heads-up while typing; the hard check
  // still happens server-side on submit (see CalendarConflictError).
  //
  // Design notes on why this shape, not a manual subscribe():
  //  - combineLatest + map derives one "candidate instant" from the two
  //    controls, so date and time changes are debounced together instead
  //    of racing each other with two independent timers.
  //  - distinctUntilChanged skips re-checking when the derived instant
  //    hasn't actually changed (e.g. an unrelated field on the form fires
  //    valueChanges too, or the same date/time is re-emitted).
  //  - switchMap cancels any in-flight request the moment a newer
  //    date/time comes in, so a slow response for an old value can never
  //    land after - and overwrite - a fresher one.
  //  - catchError is scoped to the *inner* HTTP call, so one failed check
  //    (e.g. offline) reports "no warning" without ever killing the outer
  //    stream - later edits keep working.
  //  - toSignal ties the subscription to this component's lifetime via
  //    DestroyRef, so there's no Subscription field or manual unsubscribe
  //    to remember in ngOnDestroy.
  private buildAvailabilitySignal(
    dateCtrl: AbstractControl<string | null>,
    timeCtrl: AbstractControl<string | null>,
  ): Signal<AvailabilityCheckState> {
    const candidateInstant$ = combineLatest([
      dateCtrl.valueChanges.pipe(startWith(dateCtrl.value)),
      timeCtrl.valueChanges.pipe(startWith(timeCtrl.value)),
    ]).pipe(
      map(([date, time]: [string | null, string | null]) => {
        if (!date || !time) return null;
        const candidate = new Date(`${date}T${time}`);
        return candidate.getTime() > Date.now() ? candidate.toISOString() : null;
      }),
      distinctUntilChanged(),
      debounceTime(400),
    );

    const state$: Observable<AvailabilityCheckState> = candidateInstant$.pipe(
      switchMap((scheduledAt) => {
        if (!scheduledAt) return of(NO_AVAILABILITY_WARNING);

        return concat(
          of({ checking: true, conflicts: null }),
          this.interviewService.checkAvailability(scheduledAt).pipe(
            map((res) => ({
              checking: false,
              conflicts:
                res.calendarConnected && !res.isAvailable
                  ? res.conflicts
                  : null,
            })),
            // Non-critical - stay silent, the hard check on submit still applies.
            catchError(() => of(NO_AVAILABILITY_WARNING)),
          ),
        );
      }),
    );

    return toSignal(state$, { initialValue: NO_AVAILABILITY_WARNING });
  }

  ngOnDestroy(): void {
    if (this.clockHandle) clearInterval(this.clockHandle);
  }

  save(): void {
    const type = this.form.value.interviewType as InterviewType;
    if (type === 'InPerson' && !this.form.value.location) {
      this.form.get('location')?.markAsTouched();
      return;
    }
    if (type === 'Virtual' && !this.form.value.meetingLink) {
      this.form.get('meetingLink')?.markAsTouched();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.apiError = '';
    this.calendarConflicts.set([]);
    this.saving.set(true);

    const scheduledAt = new Date(
      `${this.form.value.scheduledDate}T${this.form.value.scheduledTime}`,
    ).toISOString();

    this.interviewService
      .schedule(this.applicationId, {
        interviewType: type,
        interviewCategory: this.form.value
          .interviewCategory as InterviewCategory,
        scheduledAt,
        location: type === 'InPerson' ? this.form.value.location! : undefined,
        meetingLink:
          type === 'Virtual' ? this.form.value.meetingLink! : undefined,
        guestEmails: this.collectGuestEmails(this.guestEmailForms),
        ignoreCalendarConflicts: this.pendingIgnoreConflicts,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.pendingIgnoreConflicts = false;
          this.toast.show('Interview scheduled.', 'success');
          this.router.navigate(['/admin/applications']);
        },
        error: (err: Error) => {
          this.saving.set(false);
          if (err instanceof CalendarConflictError) {
            this.calendarConflictMessage.set(err.body.message);
            this.calendarConflicts.set(err.body.conflicts);
            this.apiError = '';
          } else {
            this.apiError = err.message;
          }
        },
      });
  }

  // Called from the "Schedule anyway" button that appears once a calendar
  // conflict is shown. Resubmits the same form with the override flag set.
  scheduleAnyway(): void {
    this.pendingIgnoreConflicts = true;
    this.calendarConflicts.set([]);
    if (this.mode() === 'reschedule') {
      this.saveReschedule();
    } else {
      this.save();
    }
  }

  dismissCalendarConflicts(): void {
    this.pendingIgnoreConflicts = false;
    this.calendarConflicts.set([]);
  }

  startReschedule(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    const dt = new Date(interview.scheduledAt);
    const date = dt.toISOString().substring(0, 10);
    const time = dt.toTimeString().substring(0, 5);

    this.rescheduleForm.reset({
      interviewType: interview.interviewType as InterviewType,
      scheduledDate: date,
      scheduledTime: time,
      location: interview.location ?? '',
      meetingLink: interview.meetingLink ?? '',
      rescheduleReason: '',
    });
    this.setGuestEmails(this.rescheduleGuestEmailForms, interview.guestEmails ?? []);
    this.apiError = '';
    this.mode.set('reschedule');
  }

  cancelRescheduleEdit(): void {
    this.apiError = '';
    this.mode.set('view');
  }

  saveReschedule(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    const type = this.rescheduleForm.value.interviewType as InterviewType;

    if (type === 'InPerson' && !this.rescheduleForm.value.location) {
      this.rescheduleForm.get('location')?.markAsTouched();
      return;
    }
    if (type === 'Virtual' && !this.rescheduleForm.value.meetingLink) {
      this.rescheduleForm.get('meetingLink')?.markAsTouched();
      return;
    }
    if (this.rescheduleForm.invalid) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }

    this.apiError = '';
    this.calendarConflicts.set([]);
    this.saving.set(true);

    const scheduledAt = new Date(
      `${this.rescheduleForm.value.scheduledDate}T${this.rescheduleForm.value.scheduledTime}`,
    ).toISOString();

    this.interviewService
      .reschedule(interview.interviewId, {
        scheduledAt,
        interviewType: type !== interview.interviewType ? type : undefined,
        location:
          type === 'InPerson' ? this.rescheduleForm.value.location! : undefined,
        meetingLink:
          type === 'Virtual'
            ? this.rescheduleForm.value.meetingLink!
            : undefined,
        guestEmails: this.collectGuestEmails(this.rescheduleGuestEmailForms),
        rescheduleReason: this.rescheduleForm.value.rescheduleReason!,
        ignoreCalendarConflicts: this.pendingIgnoreConflicts,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.pendingIgnoreConflicts = false;
          this.existingInterview.set(updated);
          this.mode.set('view');
          this.toast.show('Interview rescheduled.', 'success');
          this.loadRescheduleHistory(updated.interviewId);
        },
        error: (err: Error) => {
          this.saving.set(false);
          if (err instanceof CalendarConflictError) {
            this.calendarConflictMessage.set(err.body.message);
            this.calendarConflicts.set(err.body.conflicts);
            return;
          }
          this.apiError = err.message;
        },
      });
  }
  startOutcome(): void {
    this.outcomeForm.reset({ outcome: '', recruiterNotes: '' });
    this.apiError = '';
    this.mode.set('outcome');
  }

  cancelOutcomeEdit(): void {
    this.apiError = '';
    this.mode.set('view');
  }

  saveOutcome(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    if (this.outcomeForm.invalid) {
      this.outcomeForm.markAllAsTouched();
      return;
    }

    this.apiError = '';
    this.saving.set(true);

    const outcome = this.outcomeForm.value.outcome as 'Passed' | 'Failed';

    this.interviewService
      .setOutcome(interview.interviewId, {
        outcome,
        recruiterNotes: this.outcomeForm.value.recruiterNotes || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.existingInterview.set(updated);

          if (outcome === 'Passed') {
            this.toast.show('Outcome recorded — candidate passed.', 'success');
            this.mode.set('decision');
          } else {
            this.toast.show(
              'Outcome recorded — candidate not selected.',
              'success',
            );
            this.router.navigate(['/admin/applications']);
          }
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.apiError = err.message;
        },
      });
  }

  canScheduleNextRound = computed(() => {
    const iv = this.existingInterview();
    return !!iv && iv.roundNumber < this.maxRounds;
  });

  scheduleNextRound(): void {
    this.existingInterview.set(null);
    this.form.reset({
      interviewType: 'InPerson',
      scheduledDate: '',
      scheduledTime: '',
      location: '',
      meetingLink: '',
    });
    this.guestEmailForms.clear();
    this.apiError = '';
    this.mode.set('schedule');
  }

  extendOffer(): void {
    this.saving.set(true);
    this.appService
      .updateStatus(this.applicationId, { newStatus: 'OfferExtended' })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate([
            '/admin/applications',
            this.applicationId,
            'offer',
          ]);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.apiError = err.message;
          this.toast.show(err.message, 'error');
        },
      });
  }
  cancelInterview(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    if (!confirm('Cancel this interview? This cannot be undone.')) return;

    this.cancelling.set(true);
    this.interviewService.cancel(interview.interviewId).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.toast.show('Interview cancelled.', 'success');
        this.router.navigate(['/admin/applications']);
      },
      error: (err: Error) => {
        this.cancelling.set(false);
        this.apiError = err.message;
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  // Retries the calendar sync for the currently-viewed interview after
  // a previous failure (calendarIntegrationStatus === 'Failed').
  retryCalendarSync(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    this.syncingCalendar.set(true);
    this.interviewService.retryCalendarSync(interview.interviewId).subscribe({
      next: (updated) => {
        this.syncingCalendar.set(false);
        this.existingInterview.set(updated);
        if (updated.calendarIntegrationStatus === 'Failed') {
          this.toast.show(
            updated.calendarIntegrationError || 'Calendar sync failed again.',
            'error',
          );
        } else {
          this.toast.show('Calendar sync retried.', 'success');
        }
      },
      error: (err: Error) => {
        this.syncingCalendar.set(false);
        this.toast.show(err.message, 'error');
      },
    });
  }

  calendarStatusLabel(status: string, provider?: string): string {
    switch (status) {
      case 'Created':
      case 'Updated':
        return provider === 'Microsoft'
          ? 'Synced to Outlook calendar'
          : 'Synced to Google Calendar';
      case 'Cancelled':
        return 'Calendar event cancelled';
      case 'Failed':
        return 'Calendar sync failed';
      default:
        return 'Not synced (no calendar connected)';
    }
  }
}
