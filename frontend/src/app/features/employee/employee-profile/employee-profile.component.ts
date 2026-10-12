import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';
import {
  EmployeeProfileService,
  EmployeeProfileResponse,
  EmployeeSkillDto,
  EmployeeQualificationDto,
  EmployeeExperienceDto,
  SkillOption,
  QualificationType,
  PROFICIENCY_LEVELS,
  GENDER_OPTIONS,
  RACE_OPTIONS,
} from '../../../core/services/employee-profile.service';
 
type QualField = 'name' | 'institution' | 'yearCompleted' | 'expiryDate';
type ExpField = 'company' | 'role' | 'startDate' | 'endDate';
type PersonalField = 'phone' | 'dateOfBirth' | 'nationality';
 
// Backend rule for UpdatePersonalDetailsRequest.Phone (SA mobile, no spaces).
const SA_MOBILE = /^(\+?27|0)[6-8][0-9]{8}$/;
 
function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
 
// Routes:  'my-profile'            -> editable (the logged-in employee)
//          'admin/employees/:id'   -> read-only (HR)
// Deep links (editable view only):
//          ?section=skills|qualifications|work   scrolls to that card
//          ?editQual=<employeeQualificationId>   opens that qualification for editing
@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container ep-page">
      @if (readonly()) {
        <a (click)="goBack()" class="ep-back">
          <i class="ti ti-arrow-left"></i> Back
        </a>
      }
 
      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> {{ loadError() }}
        </div>
      } @else {
        @if (profile(); as p) {
        <!-- ───────── Header (locked fields) ───────── -->
        <div class="ep-card">
          <div class="ep-head">
            <div class="ep-avatar">{{ initials(p) }}</div>
            <div>
              <div class="ep-name">{{ p.firstName }} {{ p.lastName }}</div>
              <div class="ep-sub">
                {{ p.jobTitle || '—' }}
                @if (p.departmentName) {
                  &middot; {{ p.departmentName }}
                }
              </div>
            </div>
          </div>
          <div class="ep-locked">
            <div>
              <span class="ep-k">Employee number</span>
              <span class="ep-v"
                ><i class="ti ti-lock"></i> {{ p.externalEmployeeId || '—' }}</span
              >
            </div>
            <div>
              <span class="ep-k">Department</span>
              <span class="ep-v"
                ><i class="ti ti-lock"></i> {{ p.departmentName || '—' }}</span
              >
            </div>
            <div>
              <span class="ep-k">Start date</span>
              <span class="ep-v"
                ><i class="ti ti-lock"></i>
                {{ p.hireDate ? fmt(p.hireDate) : '—' }}</span
              >
            </div>
            <div>
              <span class="ep-k">Work email</span>
              <span class="ep-v"><i class="ti ti-lock"></i> {{ p.email }}</span>
            </div>
          </div>
          @if (!readonly()) {
            <div class="ep-note">
              Managed by the onboarding system. These details can't be edited
              here.
            </div>
          }
      
        </div>
 
        <!-- ───────── Personal details (employee only) ───────── -->
        @if (!readonly()) {
          <div class="ep-card" id="ep-personal">
            <div class="ep-h">Personal details</div>
            <form (ngSubmit)="submitPersonal()" novalidate>
              <div class="ep-grid">
                <div class="ep-field">
                  <label for="pPhone">Phone</label>
                  <input
                    id="pPhone"
                    class="ep-input"
                    name="pPhone"
                    type="tel"
                    placeholder="0821234567 or +27821234567"
                    [(ngModel)]="pForm.phone"
                  />
                  @if (pFieldError('phone'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label for="pDob">Date of birth *</label>
                  <input
                    id="pDob"
                    class="ep-input"
                    name="pDob"
                    type="date"
                    [max]="today"
                    [(ngModel)]="pForm.dateOfBirth"
                  />
                  @if (pFieldError('dateOfBirth'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label for="pGender">Gender</label>
                  <select id="pGender" class="ep-input" name="pGender" [(ngModel)]="pForm.gender">
                    <option value="">Select…</option>
                    @for (g of genderOptions; track g) {
                      <option [value]="g">{{ g }}</option>
                    }
                  </select>
                </div>
                <div class="ep-field">
                  <label for="pRace">Race (EE reporting)</label>
                  <select id="pRace" class="ep-input" name="pRace" [(ngModel)]="pForm.race">
                    <option value="">Select…</option>
                    @for (r of raceOptions; track r) {
                      <option [value]="r">{{ r }}</option>
                    }
                  </select>
                </div>
                <div class="ep-field">
                  <label for="pNat">Nationality</label>
                  <input
                    id="pNat"
                    class="ep-input"
                    name="pNat"
                    maxlength="50"
                    placeholder="e.g. South African"
                    [(ngModel)]="pForm.nationality"
                  />
                  @if (pFieldError('nationality'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label for="pEmail">Personal email</label>
                  <input
                    id="pEmail"
                    class="ep-input"
                    name="pEmail"
                    disabled
                    [value]="p.personalEmail || ''"
                  />
                </div>
              </div>
              @if (pError()) {
                <div class="ep-banner" role="alert"><i class="ti ti-alert-circle"></i> {{ pError() }}</div>
              }
              <div class="ep-actions">
                <button class="btn-primary" type="submit" [disabled]="pSaving()">
                  @if (pSaving()) {
                    <mat-spinner diameter="14" class="ep-spin"></mat-spinner>
                  }
                  Save changes
                </button>
              </div>
            </form>
          </div>
        }
 
        <!-- ───────── Skills ───────── -->
        <div class="ep-card" id="ep-skills">
          <div class="ep-h">Skills</div>
 
          @if (!readonly()) {
            <div class="ep-addrow">
              <input
                class="ep-input"
                list="ep-skill-list"
                placeholder="Search skills to add"
                aria-label="Search skills to add"
                [(ngModel)]="skillQuery"
                (ngModelChange)="skillError.set(null)"
              />
              <datalist id="ep-skill-list">
                @for (s of availableSkills(); track s.skillId) {
                  <option [value]="s.name"></option>
                }
              </datalist>
              <select class="ep-input ep-level" aria-label="Proficiency level" [(ngModel)]="skillLevel">
                @for (l of levels; track l) {
                  <option [value]="l">{{ l }}</option>
                }
              </select>
              <button
                class="btn-primary"
                type="button"
                [disabled]="skillSaving()"
                (click)="submitSkill()"
              >
                <i class="ti ti-plus"></i> Add
              </button>
            </div>
            @if (skillError()) {
              <div class="ep-field-error">{{ skillError() }}</div>
            }
          }
 
          @if (!p.skills.length) {
            <div class="ep-empty">No skills added yet.</div>
          } @else {
            <div class="ep-list">
              @for (s of p.skills; track s.employeeSkillId) {
                <div class="ep-row">
                  <div class="ep-grow">
                    <div class="ep-title">{{ s.skillName }}</div>
                    <div class="ep-meta">{{ catLabel(s.category) }}</div>
                  </div>
                  @if (readonly()) {
                    <span class="ep-chip">{{ s.proficiencyLevel }}</span>
                  } @else {
                    <select
                      class="ep-input ep-level"
                      aria-label="Proficiency level"
                      [disabled]="busyKey() === 'skill:' + s.employeeSkillId"
                      (change)="changeSkillLevel(s, $event)"
                    >
                      @for (l of levels; track l) {
                        <option [value]="l" [selected]="l === s.proficiencyLevel">
                          {{ l }}
                        </option>
                      }
                    </select>
                    <button
                      class="ep-icon-btn ep-danger"
                      type="button"
                      aria-label="Remove skill"
                      [disabled]="busyKey() === 'skill:' + s.employeeSkillId"
                      (click)="removeSkill(s)"
                    >
                      <i class="ti ti-trash"></i>
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
 
        <!-- ───────── Qualifications and certifications ───────── -->
        <div class="ep-card" id="ep-quals">
          <div class="ep-h">Qualifications and certifications</div>
 
          @if (!readonly()) {
            <form class="ep-form" id="ep-qform" (ngSubmit)="submitQual()" novalidate>
              <div class="ep-subh">
                <i class="ti ti-plus"></i>
                {{ qEditingId() ? 'Edit qualification' : 'Add a qualification' }}
              </div>
              <div class="ep-grid">
                <div class="ep-field">
                  <label>Type *</label>
                  <select
                    class="ep-input"
                    name="qType"
                    [ngModel]="qForm.type"
                    (ngModelChange)="onQualTypeChange($event)"
                  >
                    <option value="Certification">Certification</option>
                    <option value="Education">Education</option>
                  </select>
                </div>
                <div class="ep-field">
                  <label>Name *</label>
                  <input class="ep-input" name="qName" maxlength="200" [(ngModel)]="qForm.name" />
                  @if (qFieldError('name'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label>{{ qForm.type === 'Certification' ? 'Issuing body' : 'Institution' }} *</label>
                  <input class="ep-input" name="qInst" maxlength="200" [(ngModel)]="qForm.institution" />
                  @if (qFieldError('institution'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label>{{ qForm.type === 'Certification' ? 'Issue date' : 'Year completed' }} *</label>
                  <input class="ep-input" name="qDate" type="date" [max]="today" [(ngModel)]="qForm.yearCompleted" />
                  @if (qFieldError('yearCompleted'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                @if (qForm.type === 'Certification') {
                  <div class="ep-field">
                    <label>Expiry date</label>
                    <input class="ep-input" name="qExpiry" type="date" [(ngModel)]="qForm.expiryDate" />
                    @if (qFieldError('expiryDate'); as err) {
                      <div class="ep-field-error">{{ err }}</div>
                    }
                  </div>
                }
              </div>
              @if (qError()) {
                <div class="ep-banner" role="alert"><i class="ti ti-alert-circle"></i> {{ qError() }}</div>
              }
              <div class="ep-actions">
                @if (qEditingId()) {
                  <button class="ep-cancel" type="button" (click)="resetQual()">Cancel</button>
                }
                <button class="btn-primary" type="submit" [disabled]="qSaving()">
                  @if (qSaving()) {
                    <mat-spinner diameter="14" class="ep-spin"></mat-spinner>
                  } @else {
                    <i class="ti ti-plus"></i>
                  }
                  {{ qEditingId() ? 'Save' : 'Add' }}
                </button>
              </div>
            </form>
          }
 
          @if (!p.qualifications.length) {
            <div class="ep-empty">No qualifications added yet.</div>
          } @else {
            <div class="ep-list">
              @for (q of p.qualifications; track q.employeeQualificationId) {
                <div class="ep-row">
                  <div class="ep-grow">
                    <div class="ep-title">{{ q.name }}</div>
                    <div class="ep-meta">
                      {{ q.qualificationType }} &middot; {{ q.institution }} &middot;
                      @if (q.qualificationType === 'Certification') {
                        Issued {{ fmt(q.yearCompleted) }}
                        @if (q.expiryDate) {
                          &middot; Expires {{ fmt(q.expiryDate) }}
                        }
                      } @else {
                        {{ yearOf(q.yearCompleted) }}
                      }
                    </div>
                  </div>
                  @if (certBadge(q); as b) {
                    <span class="ep-badge ep-{{ b.cls }}">{{ b.label }}</span>
                    @if (!readonly() && b.cls === 'muted') {
                      <a class="ep-link" (click)="editQual(q)">Add expiry date</a>
                    }
                  }
                  @if (!readonly()) {
                    <button class="ep-icon-btn" type="button" aria-label="Edit qualification"
                            [disabled]="busyKey() === 'qual:' + q.employeeQualificationId" (click)="editQual(q)">
                      <i class="ti ti-pencil"></i>
                    </button>
                    <button class="ep-icon-btn ep-danger" type="button" aria-label="Delete qualification"
                            [disabled]="busyKey() === 'qual:' + q.employeeQualificationId" (click)="removeQual(q)">
                      <i class="ti ti-trash"></i>
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
 
        <!-- ───────── Work history ───────── -->
        <div class="ep-card" id="ep-work">
          <div class="ep-h">Work history</div>
          <div class="ep-hint">Employment before joining the company.</div>
 
          @if (!readonly()) {
            <form class="ep-form" (ngSubmit)="submitExp()" novalidate>
              <div class="ep-subh">
                <i class="ti ti-plus"></i>
                {{ xEditingId() ? 'Edit work history' : 'Add work history' }}
              </div>
              <div class="ep-grid">
                <div class="ep-field">
                  <label>Company *</label>
                  <input class="ep-input" name="xCompany" maxlength="200" [(ngModel)]="xForm.company" />
                  @if (xFieldError('company'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label>Role *</label>
                  <input class="ep-input" name="xRole" maxlength="150" [(ngModel)]="xForm.role" />
                  @if (xFieldError('role'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label>Start date *</label>
                  <input class="ep-input" name="xStart" type="date" [max]="today" [(ngModel)]="xForm.startDate" />
                  @if (xFieldError('startDate'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label>End date</label>
                  <input class="ep-input" name="xEnd" type="date" [(ngModel)]="xForm.endDate" />
                  @if (xFieldError('endDate'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field ep-span">
                  <label>Projects and duties</label>
                  <textarea class="ep-input" name="xDuties" rows="3" [(ngModel)]="xForm.duties"></textarea>
                </div>
              </div>
              @if (xError()) {
                <div class="ep-banner" role="alert"><i class="ti ti-alert-circle"></i> {{ xError() }}</div>
              }
              <div class="ep-actions">
                @if (xEditingId()) {
                  <button class="ep-cancel" type="button" (click)="resetExp()">Cancel</button>
                }
                <button class="btn-primary" type="submit" [disabled]="xSaving()">
                  @if (xSaving()) {
                    <mat-spinner diameter="14" class="ep-spin"></mat-spinner>
                  } @else {
                    <i class="ti ti-plus"></i>
                  }
                  {{ xEditingId() ? 'Save' : 'Add' }}
                </button>
              </div>
            </form>
          }
 
          @if (!p.experiences.length) {
            <div class="ep-empty">No work history added yet.</div>
          } @else {
            <div class="ep-list">
              @for (x of p.experiences; track x.employeeExperienceId) {
                <div class="ep-row">
                  <div class="ep-grow">
                    <div class="ep-title">{{ x.role }}</div>
                    <div class="ep-meta">
                      {{ x.company }} &middot; {{ monthYear(x.startDate) }} –
                      {{ x.endDate ? monthYear(x.endDate) : 'Present' }}
                    </div>
                    @if (x.projectsAndDuties) {
                      <div class="ep-duties">{{ x.projectsAndDuties }}</div>
                    }
                  </div>
                  @if (!readonly()) {
                    <button class="ep-icon-btn" type="button" aria-label="Edit work history"
                            [disabled]="busyKey() === 'exp:' + x.employeeExperienceId" (click)="editExp(x)">
                      <i class="ti ti-pencil"></i>
                    </button>
                    <button class="ep-icon-btn ep-danger" type="button" aria-label="Delete work history"
                            [disabled]="busyKey() === 'exp:' + x.employeeExperienceId" (click)="removeExp(x)">
                      <i class="ti ti-trash"></i>
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
         }
      }
    </div>

    <style>
      .ep-page { max-width: 900px; }
      .ep-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); cursor: pointer; margin-bottom: 14px; }
      .ep-back:hover { color: var(--navy); }
      .ep-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 22px 26px; margin-bottom: 16px; scroll-margin-top: 16px; }
      .ep-head { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
      .ep-avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
      .ep-name { font-size: 20px; font-weight: 800; color: var(--text); }
      .ep-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
      .ep-locked { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; border-top: 1px solid var(--border); padding-top: 14px; }
      .ep-k { display: block; font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .ep-v { display: block; font-size: 13.5px; font-weight: 600; color: var(--text); margin-top: 2px; word-break: break-word; }
      .ep-v i { font-size: 13px; color: var(--text-muted); }
      .ep-note { font-size: 12px; color: var(--text-muted); margin-top: 12px; }
      .ep-h { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
      .ep-hint { font-size: 12px; color: var(--text-muted); margin: -4px 0 10px; }
      .ep-subh { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10px; }
      .ep-form { border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; background: var(--surface-2); scroll-margin-top: 16px; }
      .ep-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .ep-span { grid-column: span 2; }
      .ep-field label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .ep-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; }
      .ep-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .ep-input:disabled { background: var(--surface-2); color: var(--text-muted); }
      .ep-field-error { font-size: 12px; color: #b3261e; margin-top: 3px; }
      .ep-banner { display: flex; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: 8px; font-size: 13px; background: #fdecea; color: #b3261e; }
      .ep-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
      .ep-cancel { border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 8px 14px; font: inherit; font-size: 13px; cursor: pointer; }
      .ep-addrow { display: flex; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
      .ep-addrow .ep-input:first-child { flex: 1; min-width: 200px; }
      .ep-level { width: 150px; flex-shrink: 0; }
      .ep-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
      .ep-row { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; flex-wrap: wrap; }
      .ep-grow { flex: 1; min-width: 0; }
      .ep-title { font-size: 14px; font-weight: 700; color: var(--text); }
      .ep-meta { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
      .ep-duties { font-size: 12.5px; color: var(--text); margin-top: 6px; white-space: pre-line; }
      .ep-chip { font-size: 12px; padding: 4px 10px; border-radius: 20px; background: var(--surface-2); color: var(--text); }
      .ep-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
      .ep-ok { background: #e8f5e9; color: #1a5c35; }
      .ep-warn { background: #fff3e0; color: #8a5a00; }
      .ep-danger-badge, .ep-bad { background: #fdecea; color: #b3261e; }
      .ep-muted { background: var(--surface-2); color: var(--text-muted); }
      .ep-link { font-size: 12px; color: var(--navy); cursor: pointer; text-decoration: underline; white-space: nowrap; }
      .ep-icon-btn { border: none; background: none; cursor: pointer; font-size: 17px; color: var(--text-muted); padding: 4px; border-radius: 6px; }
      .ep-icon-btn:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
      .ep-icon-btn:disabled { opacity: 0.4; cursor: default; }
      .ep-danger:hover:not(:disabled) { color: #b3261e; }
      .ep-empty { font-size: 13px; color: var(--text-muted); padding: 8px 0; }
      .ep-spin { display: inline-block; }
      .ep-spin ::ng-deep circle { stroke: #fff; }
      @media (max-width: 560px) {
        .ep-card { padding: 18px 16px; }
        .ep-grid { grid-template-columns: 1fr; }
        .ep-span { grid-column: span 1; }
        .ep-level { width: 100%; }
      }
    </style>
  `,
})
export class EmployeeProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private api = inject(EmployeeProfileService);
  private toast = inject(ToastService);
 
  readonly levels = PROFICIENCY_LEVELS;
  readonly genderOptions = GENDER_OPTIONS;
  readonly raceOptions = RACE_OPTIONS;
  readonly today = todayStr();
 
  profile = signal<EmployeeProfileResponse | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  readonly = signal(false);
  busyKey = signal<string | null>(null); // one in-flight row action at a time
 
  // ── Personal details ──
  pForm = { phone: '', dateOfBirth: '', gender: '', race: '', nationality: '' };
  pSubmitted = signal(false);
  pSaving = signal(false);
  pError = signal<string | null>(null);
 
  // ── Skills ──
  allSkills = signal<SkillOption[]>([]);
  availableSkills = computed(() => {
    const taken = new Set((this.profile()?.skills ?? []).map((s) => s.skillId));
    return this.allSkills().filter((s) => !taken.has(s.skillId));
  });
  skillQuery = '';
  skillLevel = PROFICIENCY_LEVELS[0];
  skillSaving = signal(false);
  skillError = signal<string | null>(null);
 
  // ── Qualifications ──
  qForm = {
    type: 'Certification' as QualificationType,
    name: '',
    institution: '',
    yearCompleted: '',
    expiryDate: '',
  };
  qEditingId = signal<number | null>(null);
  qSubmitted = signal(false);
  qSaving = signal(false);
  qError = signal<string | null>(null);
 
  // ── Work history ──
  xForm = { company: '', role: '', startDate: '', endDate: '', duties: '' };
  xEditingId = signal<number | null>(null);
  xSubmitted = signal(false);
  xSaving = signal(false);
  xError = signal<string | null>(null);
 
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.readonly.set(!!idParam);
 
    const profile$ = idParam
      ? this.api.getById(Number(idParam))
      : this.api.getMine();
 
    profile$.subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
        if (!idParam) {
          this.fillPersonal(p);
          this.applyDeepLink(p);
        }
      },
      error: (err) => {
        this.loadError.set(this.errMsg(err, 'Could not load the profile.'));
        this.loading.set(false);
      },
    });
 
    if (!idParam) {
      this.api
        .getSkillOptions()
        .pipe(catchError(() => of([] as SkillOption[])))
        .subscribe((s) => this.allSkills.set(s));
    }
  }
 
  // Dashboard links: ?section=skills|qualifications|work, ?editQual=<id>
  private applyDeepLink(p: EmployeeProfileResponse): void {
    const qp = this.route.snapshot.queryParamMap;
 
    const editId = Number(qp.get('editQual'));
    if (editId) {
      const q = p.qualifications.find((x) => x.employeeQualificationId === editId);
      if (q) {
        this.editQual(q);
        return;
      }
    }
 
    const targets: Record<string, string> = {
      skills: 'ep-skills',
      qualifications: 'ep-quals',
      work: 'ep-work',
      personal: 'ep-personal',
    };
    const target = targets[qp.get('section') ?? ''];
    if (target) this.scrollToId(target);
  }
 
  private scrollToId(id: string): void {
    // Wait a tick so the card has rendered after the profile signal was set.
    setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    );
  }
 
  // ───────────── Personal details ─────────────
 
  private fillPersonal(p: EmployeeProfileResponse): void {
    this.pForm = {
      phone: p.phone ?? '',
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
      gender: p.gender ?? '',
      race: p.race ?? '',
      nationality: p.nationality ?? '',
    };
  }
 
  // Spaces and dashes are allowed while typing; the API wants them stripped.
  private normalizePhone(v: string): string {
    return v.replace(/[\s-]/g, '');
  }
 
  private ageOn(dob: string): number {
    const [y, m, d] = dob.split('-').map(Number);
    const t = new Date();
    let age = t.getFullYear() - y;
    if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) age--;
    return age;
  }
 
  pFieldError(f: PersonalField): string | null {
    if (!this.pSubmitted()) return null;
    const v = this.pForm;
    switch (f) {
      case 'phone': {
        const n = this.normalizePhone(v.phone);
        return !n || SA_MOBILE.test(n)
          ? null
          : 'Enter a valid South African mobile number, e.g. 082 123 4567 or +27 82 123 4567.';
      }
      case 'dateOfBirth':
        if (!v.dateOfBirth) return 'Choose your date of birth.';
        if (v.dateOfBirth > this.today) return 'Date of birth can\u2019t be in the future.';
        return this.ageOn(v.dateOfBirth) < 18 ? 'You must be at least 18 years old.' : null;
      case 'nationality':
        return v.nationality.trim().length > 50 ? 'Maximum 50 characters.' : null;
    }
  }
 
  private personalHasErrors(): boolean {
    const fields: PersonalField[] = ['phone', 'dateOfBirth', 'nationality'];
    return fields.some((f) => !!this.pFieldError(f));
  }
 
  submitPersonal(): void {
    if (this.pSaving()) return;
    this.pSubmitted.set(true);
    if (this.personalHasErrors()) return;
 
    const v = this.pForm;
    const body = {
      phone: this.normalizePhone(v.phone) || null,
      gender: v.gender || null,
      race: v.race || null,
      nationality: v.nationality.trim() || null,
      dateOfBirth: v.dateOfBirth,
    };
 
    this.pSaving.set(true);
    this.pError.set(null);
    this.api.updatePersonal(body).subscribe({
      next: (p) => {
        if (p) {
          this.profile.set(p);
          this.fillPersonal(p);
        }
        this.pSaving.set(false);
        this.pSubmitted.set(false);
        this.toast.show('Personal details saved.', 'success');
      },
      error: (err) => {
        this.pSaving.set(false);
        this.pError.set(this.errMsg(err, 'Could not save your personal details.'));
      },
    });
  }
 
  // ───────────── Skills ─────────────
 
  catLabel(c: string): string {
    return c === 'SoftSkill' ? 'Soft skill' : c;
  }
 
  submitSkill(): void {
    if (this.skillSaving()) return;
    const q = this.skillQuery.trim().toLowerCase();
    const skill = this.availableSkills().find((s) => s.name.toLowerCase() === q);
    if (!skill) {
      this.skillError.set(q ? 'Choose a skill from the list.' : 'Enter a skill.');
      return;
    }
    this.skillSaving.set(true);
    this.api.addSkill({ skillId: skill.skillId, proficiencyLevel: this.skillLevel }).subscribe({
      next: (dto) => {
        this.patch((p) => ({
          ...p,
          skills: [...p.skills, dto].sort((a, b) => a.skillName.localeCompare(b.skillName)),
        }));
        this.skillQuery = '';
        this.skillLevel = PROFICIENCY_LEVELS[0];
        this.skillSaving.set(false);
        this.toast.show(`${dto.skillName} added.`, 'success');
      },
      error: (err) => {
        this.skillSaving.set(false);
        this.skillError.set(this.errMsg(err, 'Could not add the skill.'));
      },
    });
  }
 
  changeSkillLevel(s: EmployeeSkillDto, ev: Event): void {
    const select = ev.target as HTMLSelectElement;
    const level = select.value;
    if (level === s.proficiencyLevel) return;
    this.busyKey.set('skill:' + s.employeeSkillId);
    this.api.updateSkill(s.employeeSkillId, level).subscribe({
      next: (dto) => {
        this.patch((p) => ({
          ...p,
          skills: p.skills.map((x) => (x.employeeSkillId === s.employeeSkillId ? { ...x, ...dto } : x)),
        }));
        this.busyKey.set(null);
      },
      error: (err) => {
        select.value = s.proficiencyLevel; // revert the control
        this.busyKey.set(null);
        this.toast.show(this.errMsg(err, 'Could not update the level.'), 'error');
      },
    });
  }
 
  removeSkill(s: EmployeeSkillDto): void {
    if (!confirm(`Remove ${s.skillName} from your skills?`)) return;
    this.busyKey.set('skill:' + s.employeeSkillId);
    this.api.deleteSkill(s.employeeSkillId).subscribe({
      next: () => {
        this.patch((p) => ({ ...p, skills: p.skills.filter((x) => x.employeeSkillId !== s.employeeSkillId) }));
        this.busyKey.set(null);
        this.toast.show(`${s.skillName} removed.`, 'success');
      },
      error: (err) => {
        this.busyKey.set(null);
        this.toast.show(this.errMsg(err, 'Could not remove the skill.'), 'error');
      },
    });
  }
 
  // ───────────── Qualifications ─────────────
 
  onQualTypeChange(type: QualificationType): void {
    this.qForm.type = type;
    if (type === 'Education') this.qForm.expiryDate = '';
  }
 
  qFieldError(f: QualField): string | null {
    if (!this.qSubmitted()) return null;
    const v = this.qForm;
    switch (f) {
      case 'name': {
        const n = v.name.trim();
        return !n ? 'Enter a name.' : n.length > 200 ? 'Maximum 200 characters.' : null;
      }
      case 'institution': {
        const n = v.institution.trim();
        return !n
          ? v.type === 'Certification' ? 'Enter the issuing body.' : 'Enter the institution.'
          : n.length > 200 ? 'Maximum 200 characters.' : null;
      }
      case 'yearCompleted':
        if (!v.yearCompleted) return 'Choose a date.';
        return v.yearCompleted > this.today ? 'The date can\u2019t be in the future.' : null;
      case 'expiryDate':
        if (v.type !== 'Certification' || !v.expiryDate) return null;
        return v.expiryDate <= v.yearCompleted ? 'Expiry date must be after the issue date.' : null;
    }
  }
 
  private qualHasErrors(): boolean {
    const fields: QualField[] = ['name', 'institution', 'yearCompleted', 'expiryDate'];
    return fields.some((f) => !!this.qFieldError(f));
  }
 
  editQual(q: EmployeeQualificationDto): void {
    this.qForm = {
      type: q.qualificationType,
      name: q.name,
      institution: q.institution,
      yearCompleted: q.yearCompleted.slice(0, 10),
      expiryDate: q.expiryDate ? q.expiryDate.slice(0, 10) : '',
    };
    this.qEditingId.set(q.employeeQualificationId);
    this.qSubmitted.set(false);
    this.qError.set(null);
    // The form sits at the top of its card, so bring that into view
    // rather than jumping to the top of the whole page.
    this.scrollToId('ep-qform');
  }
 
  resetQual(): void {
    this.qForm = { type: 'Certification', name: '', institution: '', yearCompleted: '', expiryDate: '' };
    this.qEditingId.set(null);
    this.qSubmitted.set(false);
    this.qError.set(null);
  }
 
  submitQual(): void {
    if (this.qSaving()) return;
    this.qSubmitted.set(true);
    if (this.qualHasErrors()) return;
 
    const v = this.qForm;
    const body = {
      qualificationType: v.type,
      name: v.name.trim(),
      institution: v.institution.trim(),
      yearCompleted: v.yearCompleted,
      expiryDate: v.type === 'Certification' && v.expiryDate ? v.expiryDate : null,
    };
    const id = this.qEditingId();
    const call$ = id ? this.api.updateQualification(id, body) : this.api.addQualification(body);
 
    this.qSaving.set(true);
    this.qError.set(null);
    call$.subscribe({
      next: (dto) => {
        this.patch((p) => {
          const list = id
            ? p.qualifications.map((x) => (x.employeeQualificationId === id ? dto : x))
            : [...p.qualifications, dto];
          list.sort((a, b) => b.yearCompleted.localeCompare(a.yearCompleted));
          return { ...p, qualifications: list };
        });
        this.qSaving.set(false);
        this.resetQual();
        this.toast.show(id ? 'Qualification updated.' : 'Qualification added.', 'success');
      },
      error: (err) => {
        this.qSaving.set(false);
        this.qError.set(this.errMsg(err, 'Could not save the qualification.'));
      },
    });
  }
 
  removeQual(q: EmployeeQualificationDto): void {
    if (!confirm(`Delete ${q.name}?`)) return;
    this.busyKey.set('qual:' + q.employeeQualificationId);
    this.api.deleteQualification(q.employeeQualificationId).subscribe({
      next: () => {
        this.patch((p) => ({
          ...p,
          qualifications: p.qualifications.filter((x) => x.employeeQualificationId !== q.employeeQualificationId),
        }));
        if (this.qEditingId() === q.employeeQualificationId) this.resetQual();
        this.busyKey.set(null);
        this.toast.show('Qualification deleted.', 'success');
      },
      error: (err) => {
        this.busyKey.set(null);
        this.toast.show(this.errMsg(err, 'Could not delete the qualification.'), 'error');
      },
    });
  }
 
  // Status comes from the server; days remaining is only for the label.
  certBadge(q: EmployeeQualificationDto): { label: string; cls: string } | null {
    if (q.qualificationType !== 'Certification') return null;
    switch (q.certificationStatus) {
      case 'Expired': {
        const n = q.expiryDate ? this.daysUntil(q.expiryDate) : null;
        if (n === null) return { label: 'Expired', cls: 'bad' };
        const days = Math.abs(n);
        return {
          label: days === 0 ? 'Expired today' : `Expired ${days} day${days === 1 ? '' : 's'} ago`,
          cls: 'bad',
        };
      }
      case 'Expiring': {
        const n = q.expiryDate ? this.daysUntil(q.expiryDate) : null;
        return { label: n !== null ? `Expires in ${n} day${n === 1 ? '' : 's'}` : 'Expiring', cls: 'warn' };
      }
      case 'Valid':
        return { label: 'Valid', cls: 'ok' };
      default:
        return { label: 'No expiry set', cls: 'muted' };
    }
  }
 
  // ───────────── Work history ─────────────
 
  xFieldError(f: ExpField): string | null {
    if (!this.xSubmitted()) return null;
    const v = this.xForm;
    switch (f) {
      case 'company': {
        const n = v.company.trim();
        return !n ? 'Enter the company.' : n.length > 200 ? 'Maximum 200 characters.' : null;
      }
      case 'role': {
        const n = v.role.trim();
        return !n ? 'Enter the role.' : n.length > 150 ? 'Maximum 150 characters.' : null;
      }
      case 'startDate':
        if (!v.startDate) return 'Choose a start date.';
        return v.startDate > this.today ? 'Start date can\u2019t be in the future.' : null;
      case 'endDate':
        return v.endDate && v.startDate && v.endDate < v.startDate
          ? 'End date can\u2019t be before the start date.'
          : null;
    }
  }
 
  private expHasErrors(): boolean {
    const fields: ExpField[] = ['company', 'role', 'startDate', 'endDate'];
    return fields.some((f) => !!this.xFieldError(f));
  }
 
  editExp(x: EmployeeExperienceDto): void {
    this.xForm = {
      company: x.company,
      role: x.role,
      startDate: x.startDate.slice(0, 10),
      endDate: x.endDate ? x.endDate.slice(0, 10) : '',
      duties: x.projectsAndDuties ?? '',
    };
    this.xEditingId.set(x.employeeExperienceId);
    this.xSubmitted.set(false);
    this.xError.set(null);
    this.scrollToId('ep-work');
  }
 
  resetExp(): void {
    this.xForm = { company: '', role: '', startDate: '', endDate: '', duties: '' };
    this.xEditingId.set(null);
    this.xSubmitted.set(false);
    this.xError.set(null);
  }
 
  submitExp(): void {
    if (this.xSaving()) return;
    this.xSubmitted.set(true);
    if (this.expHasErrors()) return;
 
    const v = this.xForm;
    const body = {
      company: v.company.trim(),
      role: v.role.trim(),
      startDate: v.startDate,
      endDate: v.endDate || null,
      projectsAndDuties: v.duties.trim() || null,
    };
    const id = this.xEditingId();
    const call$ = id ? this.api.updateExperience(id, body) : this.api.addExperience(body);
 
    this.xSaving.set(true);
    this.xError.set(null);
    call$.subscribe({
      next: (dto) => {
        this.patch((p) => {
          const list = id
            ? p.experiences.map((x) => (x.employeeExperienceId === id ? dto : x))
            : [...p.experiences, dto];
          list.sort((a, b) => b.startDate.localeCompare(a.startDate));
          return { ...p, experiences: list };
        });
        this.xSaving.set(false);
        this.resetExp();
        this.toast.show(id ? 'Work history updated.' : 'Work history added.', 'success');
      },
      error: (err) => {
        this.xSaving.set(false);
        this.xError.set(this.errMsg(err, 'Could not save the work history.'));
      },
    });
  }
 
  removeExp(x: EmployeeExperienceDto): void {
    if (!confirm(`Delete ${x.role} at ${x.company}?`)) return;
    this.busyKey.set('exp:' + x.employeeExperienceId);
    this.api.deleteExperience(x.employeeExperienceId).subscribe({
      next: () => {
        this.patch((p) => ({
          ...p,
          experiences: p.experiences.filter((e) => e.employeeExperienceId !== x.employeeExperienceId),
        }));
        if (this.xEditingId() === x.employeeExperienceId) this.resetExp();
        this.busyKey.set(null);
        this.toast.show('Work history deleted.', 'success');
      },
      error: (err) => {
        this.busyKey.set(null);
        this.toast.show(this.errMsg(err, 'Could not delete the work history.'), 'error');
      },
    });
  }
 
  // ───────────── Helpers ─────────────
 
  private patch(fn: (p: EmployeeProfileResponse) => EmployeeProfileResponse): void {
    this.profile.update((p) => (p ? fn(p) : p));
  }
 
  // Handles { message } and ASP.NET { errors: { Field: [msg] } }.
  private errMsg(err: any, fallback: string): string {
    const e = err?.error;
    if (e?.message) return e.message;
    if (e?.errors) {
      const first = (Object.values(e.errors) as unknown[]).flat()[0];
      if (first) return String(first);
    }
    return err?.message ?? fallback;
  }
 
  private daysUntil(iso: string): number {
    const target = new Date(iso);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / 86400000);
  }
 
  initials(p: EmployeeProfileResponse): string {
    return ((p.firstName?.[0] ?? '') + (p.lastName?.[0] ?? '')).toUpperCase() || '?';
  }
 
  fmt(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  monthYear(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
  }
  yearOf(d: string): string {
    return String(new Date(d).getFullYear());
  }
 
  goBack(): void {
    this.location.back();
  }
}
 

