import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CandidateStateService } from '../../core/services/candidate-state.service';
import { ProfileCompletionService } from '../../core/services/profile-completion.service';

import { CvUploadStepComponent } from './cv-upload-step.component';
import { PersonalInfoStepComponent } from './personal-info-step.component';
import { AddressStepComponent } from './address-step.component';
import { DocumentsComponent } from '../documents/documents.component';
import { CandidateSkillsComponent } from '../skills/candidate-skills.component';
import { CandidateExperienceComponent } from '../experience/candidate-experience.component';
import { CandidateQualificationsComponent } from '../qualifications/candidate-qualifications.component';
import { ResumeAutofillStoreService } from '../../core/services/resume-autofill-store.service';

type StepKey =
  | 'cv'
  | 'personal'
  | 'address'
  | 'documents'
  | 'skills'
  | 'experience'
  | 'qualifications';

interface StepDef {
  key: StepKey;
  label: string;
  icon: string;
  title: string;
}

const STEPS: StepDef[] = [
  { key: 'cv', label: 'CV', icon: 'ti-file-cv', title: 'Upload your CV' },
  {
    key: 'personal',
    label: 'Personal',
    icon: 'ti-user',
    title: 'Personal information',
  },
  {
    key: 'address',
    label: 'Address',
    icon: 'ti-map-pin',
    title: 'Home address',
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: 'ti-file',
    title: 'Upload documents',
  },
  { key: 'skills', label: 'Skills', icon: 'ti-bulb', title: 'Skills' },
  {
    key: 'experience',
    label: 'Experience',
    icon: 'ti-briefcase',
    title: 'Work experience',
  },
  {
    key: 'qualifications',
    label: 'Qualifications',
    icon: 'ti-school',
    title: 'Qualifications',
  },
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    CvUploadStepComponent,
    PersonalInfoStepComponent,
    AddressStepComponent,
    DocumentsComponent,
    CandidateSkillsComponent,
    CandidateExperienceComponent,
    CandidateQualificationsComponent,
  ],
  template: `
    <div class="page-container">
      @if (initialLoading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!completion.allComplete()) {
        <!-- SETUP WIZARD -->
        <div class="wizard-header">
          <div>
            <h2 class="page-title">
              <i class="ti ti-user-check"></i> Complete your profile
            </h2>
            <p class="page-sub">Jump to any section, in any order.</p>
          </div>
          <span
            class="pct-badge"
            [class.pct-low]="completion.pctComplete() < 40"
            [class.pct-mid]="
              completion.pctComplete() >= 40 && completion.pctComplete() < 80
            "
            [class.pct-high]="completion.pctComplete() >= 80"
          >
            {{ completion.pctComplete() }}% complete
          </span>
        </div>

        <div class="progress-track">
          <div
            class="progress-fill"
            [style.width.%]="completion.pctComplete()"
            [class.pct-low]="completion.pctComplete() < 40"
            [class.pct-mid]="
              completion.pctComplete() >= 40 && completion.pctComplete() < 80
            "
            [class.pct-high]="completion.pctComplete() >= 80"
          ></div>
        </div>

        <div class="stepper-row">
          <div class="stepper-line-track"></div>
          <div
            class="stepper-line-fill"
            [style.width.%]="completion.pctComplete()"
          ></div>

          @for (s of steps; track s.key) {
            <button
              type="button"
              class="step-circle-wrap"
              (click)="goTo(s.key)"
            >
              <span
                class="step-circle"
                [class.done]="completion.isComplete(s.key)"
                [class.active]="
                  current() === s.key && !completion.isComplete(s.key)
                "
              >
                @if (completion.isComplete(s.key)) {
                  <i class="ti ti-check"></i>
                } @else {
                  <i class="ti {{ s.icon }}"></i>
                }
              </span>
              <span class="step-label" [class.active]="current() === s.key">{{
                s.label
              }}</span>
            </button>
          }
        </div>

        <div class="step-card">
          @switch (current()) {
            @case ('cv') {
              <app-cv-upload-step [embedded]="true" (saved)="onStepSaved()" />
            }
            @case ('personal') {
              <app-personal-info-step
                #personalStep
                [embedded]="true"
                [hideSubmit]="true"
                (saved)="onStepSaved()"
              />
            }
            @case ('address') {
              <app-address-step
                #addressStep
                [embedded]="true"
                [autoAdvanceOnSave]="false"
                (saved)="onStepSaved()"
              />
            }
            @case ('documents') {
              <app-documents [embedded]="true" (saved)="onStepSaved()" />
            }
            @case ('skills') {
              <app-candidate-skills
                [embedded]="true"
                [autoAdvanceOnSave]="false"
                (saved)="onStepSaved()"
              />
            }
            @case ('experience') {
              <app-candidate-experience
                #experienceStep
                [embedded]="true"
                [autoAdvanceOnSave]="false"
                (saved)="onStepSaved()"
              />
            }
            @case ('qualifications') {
              <app-candidate-qualifications
                [embedded]="true"
                [autoAdvanceOnSave]="false"
                (saved)="onStepSaved()"
              />
            }
          }
        </div>

        <div class="wizard-footer">
          <button
            mat-stroked-button
            style="border-radius:8px"
            [disabled]="stepIndex() === 0"
            (click)="back()"
          >
            <i class="ti ti-arrow-left"></i>&nbsp;Back
          </button>
          <div style="display:flex;gap:8px">
            @if (stepIndex() < steps.length - 1) {
              <button
                mat-stroked-button
                style="border-radius:8px"
                (click)="skip()"
              >
                Skip for now
              </button>
            }
            <button
              mat-raised-button
              color="primary"
              style="border-radius:8px"
              (click)="primaryAction()"
            >
              {{
                stepIndex() === steps.length - 1
                  ? 'Finish'
                  : 'Save and continue'
              }}&nbsp;<i class="ti ti-arrow-right"></i>
            </button>
          </div>
        </div>
      } @else {
        <!-- COMPLETED PROFILE: SUMMARY + EDIT IN PLACE -->
        <div class="page-header">
          <div>
            <h2 class="page-title">
              <i class="ti ti-user-check"></i> Candidate profile
            </h2>
            <p class="page-sub">Your registered candidate profile</p>
          </div>
          <span class="status-pill s-offer">Active</span>
        </div>

        @for (s of steps; track s.key) {
          <div class="summary-row-card">
            <div class="summary-row-head">
              <div class="summary-row-title">
                <i class="ti {{ s.icon }}"></i> {{ s.title }}
              </div>
              @if (editingSection() !== s.key) {
                <button
                  mat-stroked-button
                  style="border-radius:8px;font-size:12px"
                  (click)="editingSection.set(s.key)"
                >
                  <i class="ti ti-pencil"></i>&nbsp;Edit
                </button>
              } @else {
                <button
                  mat-stroked-button
                  style="border-radius:8px;font-size:12px"
                  (click)="editingSection.set(null)"
                >
                  <i class="ti ti-x"></i>&nbsp;Close
                </button>
              }
            </div>

            @if (editingSection() === s.key) {
              @switch (s.key) {
                @case ('cv') {
                  <app-cv-upload-step
                    [embedded]="true"
                    (saved)="onSectionSaved()"
                  />
                }
                @case ('personal') {
                  <app-personal-info-step
                    [embedded]="true"
                    (saved)="onSectionSaved()"
                  />
                }
                @case ('address') {
                  <app-address-step
                    [embedded]="true"
                    (saved)="onSectionSaved()"
                  />
                }
                @case ('documents') {
                  <app-documents [embedded]="true" (saved)="onSectionSaved()" />
                }
                @case ('skills') {
                  <app-candidate-skills
                    [embedded]="true"
                    (saved)="onSectionSaved()"
                  />
                }
                @case ('experience') {
                  <app-candidate-experience
                    [embedded]="true"
                    (saved)="onSectionSaved()"
                  />
                }
                @case ('qualifications') {
                  <app-candidate-qualifications
                    [embedded]="true"
                    (saved)="onSectionSaved()"
                  />
                }
              }
            }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      /* ---- palette used only in this component ---- */
      :host {
        --step-border: #e2e8f0;
        --step-muted: #94a3b8;
        --step-active: #051e3b;
        --step-done: #16a673;
        --card-border: #e5e7eb;
      }

      .wizard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .pct-badge {
        font-size: 13px;
        font-weight: 600;
        padding: 6px 14px;
        border-radius: 999px;
        transition:
          background-color 0.2s ease,
          color 0.2s ease;
      }
      .pct-badge.pct-low {
        background: #fdeaea;
        color: #c0392b;
      }
      .pct-badge.pct-mid {
        background: #fff4d6;
        color: #b7791f;
      }
      .pct-badge.pct-high {
        background: #e1f5ee;
        color: #0f6e56;
      }
      .progress-track {
        height: 6px;
        background: #eef0f3;
        border-radius: 999px;
        margin-bottom: 28px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        transition:
          width 0.3s ease,
          background-color 0.2s ease;
      }
      .progress-fill.pct-low {
        background: #c0392b;
      }
      .progress-fill.pct-mid {
        background: #d9a441;
      }
      .progress-fill.pct-high {
        background: var(--step-done);
      }

      /* ---- stepper: neutral resting state, a connecting line, states that mean something ---- */
      .stepper-row {
        position: relative;
        display: flex;
        justify-content: space-between;
        margin-bottom: 24px;
      }
      .stepper-line-track {
        position: absolute;
        top: 22px;
        left: 32px;
        right: 32px;
        height: 2px;
        background: var(--step-border);
        z-index: 0;
      }
      .stepper-line-fill {
        position: absolute;
        top: 22px;
        left: 32px;
        height: 2px;
        background: var(--step-done);
        z-index: 0;
        transition: width 0.3s ease;
        max-width: calc(100% - 64px);
      }

      .step-circle-wrap {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        background: none;
        border: none;
        cursor: pointer;
        width: 64px;
      }
      .step-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 1.5px solid var(--step-border);
        color: var(--step-muted);
        background: #fff;
        transition: all 0.15s ease;
      }
      .step-circle-wrap:hover .step-circle {
        border-color: var(--step-active);
      }
      .step-circle.active {
        background: var(--step-active);
        border-color: var(--step-active);
        color: #fff;
      }
      .step-circle.done {
        background: var(--step-done);
        color: #fff;
        border-color: var(--step-done);
      }
      .step-label {
        font-size: 12px;
        color: var(--step-muted);
      }
      .step-label.active {
        color: var(--step-active);
        font-weight: 600;
      }

      .step-card {
        background: #fff;
        border-radius: 12px;
        padding: 0;
        margin-bottom: 20px;
        border: 1px solid var(--card-border);
      }
      .wizard-footer {
        display: flex;
        justify-content: space-between;
      }

      .summary-row-card {
        background: #fff;
        border: 1px solid var(--card-border);
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 10px;
      }
      .summary-row-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .summary-row-title {
        font-size: 14px;
        font-weight: 600;
        color: #14213d;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private state = inject(CandidateStateService);
  private autofillStore = inject(ResumeAutofillStoreService);
  completion = inject(ProfileCompletionService);

  @ViewChild('personalStep') personalStepCmp?: PersonalInfoStepComponent;
  @ViewChild('addressStep') addressStepCmp?: AddressStepComponent;
  @ViewChild('experienceStep') experienceStepCmp?: CandidateExperienceComponent;

  steps = STEPS;
  current = signal<StepKey>('cv');
  editingSection = signal<StepKey | null>(null);
  initialLoading = signal(true);

  stepIndex = computed(() =>
    this.steps.findIndex((s) => s.key === this.current()),
  );

  ngOnInit(): void {
    const boot = () => {
      const p = this.state.profile();
      if (!p) {
        this.initialLoading.set(false);
        return;
      }
      this.autofillStore.restore(p.candidateId);
      this.completion.load().subscribe(() => {
        this.current.set(
          this.steps.find((s) => !this.completion.isComplete(s.key))?.key ??
            'cv',
        );
        this.initialLoading.set(false);
      });
    };
    if (!this.state.loaded()) {
      this.state.loadMyProfile().subscribe(() => boot());
    } else {
      boot();
    }
  }
  goTo(key: StepKey): void {
    this.completion.load().subscribe(() => this.current.set(key));
  }
  onStepSaved(): void {
    this.continue();
  }

  onSectionSaved(): void {
    this.completion.load().subscribe();
    this.editingSection.set(null);
  }

  /** Footer's primary button. In every case, the inline "Add"/"Upload"/"Update"
   *  buttons inside each step only save and stay on that step — advancing to
   *  the next step is exclusively this button's job.
   *  - CV step: upload itself is the save action (there's no separate form to
   *    submit here), so this just advances.
   *  - Personal step: its inline submit button is hidden in the wizard, so this
   *    triggers the form's own submit() directly.
   *  - Address step: if an add/edit address form is currently open, this submits
   *    that form first (forceAdvance=true), advancing only once it succeeds.
   *  - Experience step: if the add-experience form has unsaved input, this
   *    submits it first (forceAdvance=true) before advancing; if the form is
   *    untouched, it just advances (nothing new to save).
   *  - Documents/Skills/Qualifications: uploads/adds already save immediately
   *    on their own inline controls, so this just advances. */
  primaryAction(): void {
    if (this.current() === 'personal') {
      this.personalStepCmp?.submit();
    } else if (this.current() === 'address' && this.addressStepCmp?.editing()) {
      this.addressStepCmp.submitAddress(true);
    } else if (
      this.current() === 'experience' &&
      this.experienceStepCmp?.form.dirty
    ) {
      this.experienceStepCmp.add(true);
    } else {
      this.continue();
    }
  }

  back(): void {
    const i = this.stepIndex();
    if (i > 0) this.goTo(this.steps[i - 1].key);
  }

  skip(): void {
    const i = this.stepIndex();
    if (i < this.steps.length - 1) this.goTo(this.steps[i + 1].key);
  }

  continue(): void {
    const i = this.stepIndex();
    if (i < this.steps.length - 1) this.goTo(this.steps[i + 1].key);
  }
}
