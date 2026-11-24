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
type TabId =
  | 'personal'
  | 'experience'
  | 'skills'
  | 'qualifications'
  | 'certifications';
type SkillGroup = 'Technical' | 'SoftSkill';

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
// Layout: page title, a pill tab bar, and one card per tab (same pattern as the candidate profile).
// Deep links (editable view only):
//          ?section=personal|work|skills|qualifications|certifications   opens that tab
//          ?editQual=<employeeQualificationId>   opens that qualification for editing (on its own tab)
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
        @if (profile(); as hp) {
          <div class="ep-pagetitle">{{ hp.firstName }} {{ hp.lastName }}</div>
          <div class="ep-pagesub">
            {{ hp.jobTitle || '—' }}
            @if (hp.departmentName) {
              &middot; {{ hp.departmentName }}
            }
          </div>
        }
      } @else {
        <div class="ep-pagetitle">My Profile</div>
        <div class="ep-pagesub">
          Manage your personal information and career development
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> {{ loadError() }}
        </div>
      } @else {
        @if (profile(); as p) {
          <!-- ───────── Tab bar ───────── -->
          <div class="ep-tabs" role="tablist" aria-label="Profile sections">
            @for (t of tabs; track t.id) {
              <button
                type="button"
                role="tab"
                class="ep-tab"
                [id]="'ep-tab-' + t.id"
                [class.active]="tab() === t.id"
                [attr.aria-selected]="tab() === t.id"
                aria-controls="ep-panel"
                (click)="selectTab(t.id)"
              >
                {{ t.label }}
              </button>
            }
          </div>

          <!-- Shared by the Qualifications and Certifications tabs -->
          <ng-template #qualFormTpl>
            <form
              class="ep-form"
              id="ep-qform"
              (ngSubmit)="submitQual()"
              novalidate
            >
              <div class="ep-subh">
                {{ qEditingId() ? 'Edit' : 'Add' }}
                {{
                  qForm.type === 'Certification'
                    ? 'certification'
                    : 'qualification'
                }}
              </div>
              <div class="ep-grid">
                <div class="ep-field">
                  <label for="qName">Name *</label>
                  <input
                    id="qName"
                    class="ep-input"
                    name="qName"
                    maxlength="200"
                    [(ngModel)]="qForm.name"
                  />
                  @if (qFieldError('name'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label for="qInst"
                    >{{
                      qForm.type === 'Certification'
                        ? 'Issuing body'
                        : 'Institution'
                    }}
                    *</label
                  >
                  <input
                    id="qInst"
                    class="ep-input"
                    name="qInst"
                    maxlength="200"
                    [(ngModel)]="qForm.institution"
                  />
                  @if (qFieldError('institution'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                <div class="ep-field">
                  <label for="qDate"
                    >{{
                      qForm.type === 'Certification'
                        ? 'Issue date'
                        : 'Year completed'
                    }}
                    *</label
                  >
                  <input
                    id="qDate"
                    class="ep-input"
                    name="qDate"
                    type="date"
                    [max]="today"
                    [(ngModel)]="qForm.yearCompleted"
                  />
                  @if (qFieldError('yearCompleted'); as err) {
                    <div class="ep-field-error">{{ err }}</div>
                  }
                </div>
                @if (qForm.type === 'Certification') {
                  <div class="ep-field">
                    <label for="qExpiry">Expiry date</label>
                    <input
                      id="qExpiry"
                      class="ep-input"
                      name="qExpiry"
                      type="date"
                      [(ngModel)]="qForm.expiryDate"
                    />
                    @if (qFieldError('expiryDate'); as err) {
                      <div class="ep-field-error">{{ err }}</div>
                    }
                  </div>
                }
              </div>
              @if (qError()) {
                <div class="ep-banner" role="alert">
                  <i class="ti ti-alert-circle"></i> {{ qError() }}
                </div>
              }
              <div class="ep-actions">
                <button class="ep-btn" type="button" (click)="resetQual()">
                  Cancel
                </button>
                <button
                  class="btn-primary"
                  type="submit"
                  [disabled]="qSaving()"
                >
                  @if (qSaving()) {
                    <mat-spinner diameter="14" class="ep-spin"></mat-spinner>
                  }
                  {{ qEditingId() ? 'Save' : 'Add' }}
                </button>
              </div>
            </form>
          </ng-template>

          <!-- One skills card (Technical or Soft) -->
          <ng-template
            #skillCardTpl
            let-title="title"
            let-group="group"
            let-items="items"
          >
            <div class="ep-card">
              <div class="ep-cardhead">
                <div class="ep-h">{{ title }}</div>
                @if (!readonly()) {
                  <button
                    class="ep-btn"
                    type="button"
                    [disabled]="skillFormFor() === group"
                    (click)="openSkillForm(group)"
                  >
                    Add Skill
                  </button>
                }
              </div>

              @if (skillFormFor() === group) {
                <div class="ep-form">
                  <div class="ep-addrow">
                    <div class="ep-combo">
  <input
    class="ep-input"
    placeholder="Search skills to add"
    aria-label="Search skills to add"
    autocomplete="off"
    [ngModel]="skillQuery()"
    (ngModelChange)="onSkillInput($event)"
    (focus)="skillOpen.set(true)"
    (blur)="skillOpen.set(false)"
  />
  @if (skillOpen()) {
    @if (skillMatches().length) {
      <ul class="ep-suggest" role="listbox">
        @for (s of skillMatches(); track s.skillId) {
          <li role="option" (mousedown)="pickSkill(s)">{{ s.name }}</li>
        }
      </ul>
    } @else if (skillQuery().trim()) {
      <div class="ep-suggest ep-nomatch">No matching skills</div>
    }
  }
</div>
                    <select
                      class="ep-input ep-level"
                      aria-label="Proficiency level"
                      [(ngModel)]="skillLevel"
                    >
                      @for (l of levels; track l) {
                        <option [value]="l">{{ l }}</option>
                      }
                    </select>
                  </div>
                  @if (skillError()) {
                    <div class="ep-field-error">{{ skillError() }}</div>
                  }
                  <div class="ep-actions">
                    <button
                      class="ep-btn"
                      type="button"
                      (click)="closeSkillForm()"
                    >
                      Cancel
                    </button>
                    <button
                      class="btn-primary"
                      type="button"
                      [disabled]="skillSaving()"
                      (click)="submitSkill()"
                    >
                      @if (skillSaving()) {
                        <mat-spinner
                          diameter="14"
                          class="ep-spin"
                        ></mat-spinner>
                      }
                      Add
                    </button>
                  </div>
                </div>
              }

              @if (!items.length) {
                <div class="ep-empty">
                  {{
                    group === 'Technical'
                      ? 'No technical skills added yet.'
                      : 'No soft skills added yet.'
                  }}
                </div>
              } @else {
                <div class="ep-skilllist">
                  @for (s of items; track s.employeeSkillId) {
                    <div class="ep-skillrow">
                      <span class="ep-skillname">{{ s.skillName }}</span>
                      @if (readonly()) {
                        <span class="ep-lvl ep-lvl-{{ s.proficiencyLevel }}">{{
                          s.proficiencyLevel
                        }}</span>
                      } @else {
                        <select
                          class="ep-lvl ep-lvl-{{ s.proficiencyLevel }}"
                          [attr.aria-label]="
                            'Proficiency level for ' + s.skillName
                          "
                          title="Change level"
                          [disabled]="
                            busyKey() === 'skill:' + s.employeeSkillId
                          "
                          (change)="changeSkillLevel(s, $event)"
                        >
                          @for (l of levels; track l) {
                            <option
                              [value]="l"
                              [selected]="l === s.proficiencyLevel"
                            >
                              {{ l }}
                            </option>
                          }
                        </select>
                        <button
                          class="ep-icon-btn"
                          type="button"
                          [attr.aria-label]="'Remove ' + s.skillName"
                          [disabled]="
                            busyKey() === 'skill:' + s.employeeSkillId
                          "
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
          </ng-template>

          <div
            class="ep-panel"
            [class.ep-card]="tab() !== 'skills'"
            id="ep-panel"
            role="tabpanel"
            [attr.aria-labelledby]="'ep-tab-' + tab()"
          >
            @switch (tab()) {
              <!-- ───────── Personal information ───────── -->
              @case ('personal') {
                <div class="ep-cardhead">
                  <div class="ep-h">Personal Information</div>
                </div>

                <div class="ep-locked">
                  <div>
                    <span class="ep-k">Employee number</span>
                    <span class="ep-v"
                      ><i class="ti ti-lock"></i>
                      {{ p.externalEmployeeId || '—' }}</span
                    >
                  </div>
                  <div>
                    <span class="ep-k">Department</span>
                    <span class="ep-v"
                      ><i class="ti ti-lock"></i>
                      {{ p.departmentName || '—' }}</span
                    >
                  </div>
                  <div>
                    <span class="ep-k">Job title</span>
                    <span class="ep-v"
                      ><i class="ti ti-lock"></i> {{ p.jobTitle || '—' }}</span
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
                    <span class="ep-v"
                      ><i class="ti ti-lock"></i> {{ p.email }}</span
                    >
                  </div>
                </div>
                @if (!readonly()) {
                  <div class="ep-note">
                    Managed by the onboarding system. These details can't be
                    edited here.
                  </div>

                  <form
                    class="ep-personal"
                    (ngSubmit)="submitPersonal()"
                    novalidate
                  >
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
                        <select
                          id="pGender"
                          class="ep-input"
                          name="pGender"
                          [(ngModel)]="pForm.gender"
                        >
                          <option value="">Select…</option>
                          @for (g of genderOptions; track g) {
                            <option [value]="g">{{ g }}</option>
                          }
                        </select>
                      </div>
                      <div class="ep-field">
                        <label for="pRace">Race (EE reporting)</label>
                        <select
                          id="pRace"
                          class="ep-input"
                          name="pRace"
                          [(ngModel)]="pForm.race"
                        >
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
                      <div class="ep-banner" role="alert">
                        <i class="ti ti-alert-circle"></i> {{ pError() }}
                      </div>
                    }
                    <div class="ep-actions">
                      <button
                        class="btn-primary"
                        type="submit"
                        [disabled]="pSaving()"
                      >
                        @if (pSaving()) {
                          <mat-spinner
                            diameter="14"
                            class="ep-spin"
                          ></mat-spinner>
                        }
                        Save changes
                      </button>
                    </div>
                  </form>
                }
              }

              <!-- ───────── Experience ───────── -->
              @case ('experience') {
                <div class="ep-cardhead">
                  <div class="ep-h">Work Experience</div>
                  @if (!readonly()) {
                    <button
                      class="btn-primary"
                      type="button"
                      [disabled]="xFormOpen()"
                      (click)="openAddExp()"
                    >
                      Add Experience
                    </button>
                  }
                </div>
                <div class="ep-hint">
                  Employment before joining the company.
                </div>

                @if (xFormOpen()) {
                  <form
                    class="ep-form"
                    id="ep-xform"
                    (ngSubmit)="submitExp()"
                    novalidate
                  >
                    <div class="ep-subh">
                      {{
                        xEditingId() ? 'Edit work history' : 'Add work history'
                      }}
                    </div>
                    <div class="ep-grid">
                      <div class="ep-field">
                        <label for="xCompany">Company *</label>
                        <input
                          id="xCompany"
                          class="ep-input"
                          name="xCompany"
                          maxlength="200"
                          [(ngModel)]="xForm.company"
                        />
                        @if (xFieldError('company'); as err) {
                          <div class="ep-field-error">{{ err }}</div>
                        }
                      </div>
                      <div class="ep-field">
                        <label for="xRole">Role *</label>
                        <input
                          id="xRole"
                          class="ep-input"
                          name="xRole"
                          maxlength="150"
                          [(ngModel)]="xForm.role"
                        />
                        @if (xFieldError('role'); as err) {
                          <div class="ep-field-error">{{ err }}</div>
                        }
                      </div>
                      <div class="ep-field">
                        <label for="xStart">Start date *</label>
                        <input
                          id="xStart"
                          class="ep-input"
                          name="xStart"
                          type="date"
                          [max]="today"
                          [(ngModel)]="xForm.startDate"
                        />
                        @if (xFieldError('startDate'); as err) {
                          <div class="ep-field-error">{{ err }}</div>
                        }
                      </div>
                      <div class="ep-field">
                        <label for="xEnd">End date</label>
                        <input
                          id="xEnd"
                          class="ep-input"
                          name="xEnd"
                          type="date"
                          [(ngModel)]="xForm.endDate"
                        />
                        @if (xFieldError('endDate'); as err) {
                          <div class="ep-field-error">{{ err }}</div>
                        }
                      </div>
                      <div class="ep-field ep-span">
                        <label for="xDuties">Projects and duties</label>
                        <textarea
                          id="xDuties"
                          class="ep-input"
                          name="xDuties"
                          rows="3"
                          [(ngModel)]="xForm.duties"
                        ></textarea>
                      </div>
                    </div>
                    @if (xError()) {
                      <div class="ep-banner" role="alert">
                        <i class="ti ti-alert-circle"></i> {{ xError() }}
                      </div>
                    }
                    <div class="ep-actions">
                      <button class="ep-btn" type="button" (click)="resetExp()">
                        Cancel
                      </button>
                      <button
                        class="btn-primary"
                        type="submit"
                        [disabled]="xSaving()"
                      >
                        @if (xSaving()) {
                          <mat-spinner
                            diameter="14"
                            class="ep-spin"
                          ></mat-spinner>
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
                      <div class="ep-item">
                        <div class="ep-itemhead">
                          <div class="ep-grow">
                            <div class="ep-itemtitle">{{ x.role }}</div>
                            <div class="ep-company">{{ x.company }}</div>
                            <div class="ep-period">
                              {{ monthYear(x.startDate) }} –
                              {{ x.endDate ? monthYear(x.endDate) : 'Present' }}
                              &middot; {{ duration(x.startDate, x.endDate) }}
                            </div>
                          </div>
                          @if (!readonly()) {
                            <div class="ep-btns">
                              <button
                                class="ep-btn"
                                type="button"
                                [disabled]="
                                  busyKey() === 'exp:' + x.employeeExperienceId
                                "
                                (click)="editExp(x)"
                              >
                                Edit
                              </button>
                              <button
                                class="ep-btn ep-btn-danger"
                                type="button"
                                [disabled]="
                                  busyKey() === 'exp:' + x.employeeExperienceId
                                "
                                (click)="removeExp(x)"
                              >
                                Delete
                              </button>
                            </div>
                          }
                        </div>
                        @if (x.projectsAndDuties) {
                          <div class="ep-lbl">Projects and duties:</div>
                          <div class="ep-text">{{ x.projectsAndDuties }}</div>
                        }
                      </div>
                    }
                  </div>
                }
              }

              <!-- ───────── Skills & competencies ───────── -->
              @case ('skills') {
                <div class="ep-skillgrid">
                  <ng-container
                    *ngTemplateOutlet="
                      skillCardTpl;
                      context: {
                        title: 'Technical Skills',
                        group: 'Technical',
                        items: technicalSkills(),
                      }
                    "
                  ></ng-container>
                  <ng-container
                    *ngTemplateOutlet="
                      skillCardTpl;
                      context: {
                        title: 'Soft Skills',
                        group: 'SoftSkill',
                        items: softSkills(),
                      }
                    "
                  ></ng-container>
                </div>
              }

              <!-- ───────── Qualifications (education) ───────── -->
              @case ('qualifications') {
                <div class="ep-cardhead">
                  <div class="ep-h">Qualifications</div>
                  @if (!readonly()) {
                    <button
                      class="btn-primary"
                      type="button"
                      [disabled]="qFormOpen()"
                      (click)="openAddQual('Education')"
                    >
                      Add Qualification
                    </button>
                  }
                </div>

                @if (qFormOpen()) {
                  <ng-container *ngTemplateOutlet="qualFormTpl"></ng-container>
                }

                @if (!educationList().length) {
                  <div class="ep-empty">No qualifications added yet.</div>
                } @else {
                  <div class="ep-list">
                    @for (
                      q of educationList();
                      track q.employeeQualificationId
                    ) {
                      <div class="ep-item">
                        <div class="ep-itemhead">
                          <div class="ep-grow">
                            <div class="ep-itemtitle">{{ q.name }}</div>
                            <div class="ep-company">{{ q.institution }}</div>
                            <div class="ep-period">
                              Completed {{ yearOf(q.yearCompleted) }}
                            </div>
                          </div>
                          @if (!readonly()) {
                            <div class="ep-btns">
                              <button
                                class="ep-btn"
                                type="button"
                                [disabled]="
                                  busyKey() ===
                                  'qual:' + q.employeeQualificationId
                                "
                                (click)="editQual(q)"
                              >
                                Edit
                              </button>
                              <button
                                class="ep-btn ep-btn-danger"
                                type="button"
                                [disabled]="
                                  busyKey() ===
                                  'qual:' + q.employeeQualificationId
                                "
                                (click)="removeQual(q)"
                              >
                                Delete
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              }

              <!-- ───────── Certifications ───────── -->
              @case ('certifications') {
                <div class="ep-cardhead">
                  <div class="ep-h">Certifications</div>
                  @if (!readonly()) {
                    <button
                      class="btn-primary"
                      type="button"
                      [disabled]="qFormOpen()"
                      (click)="openAddQual('Certification')"
                    >
                      Add Certification
                    </button>
                  }
                </div>

                @if (qFormOpen()) {
                  <ng-container *ngTemplateOutlet="qualFormTpl"></ng-container>
                }

                @if (!certificationList().length) {
                  <div class="ep-empty">No certifications added yet.</div>
                } @else {
                  <div class="ep-list">
                    @for (
                      q of certificationList();
                      track q.employeeQualificationId
                    ) {
                      <div class="ep-item">
                        <div class="ep-itemhead">
                          <div class="ep-grow">
                            <div class="ep-itemtitle">{{ q.name }}</div>
                            <div class="ep-company">{{ q.institution }}</div>
                            <div class="ep-period">
                              Issued {{ fmt(q.yearCompleted) }}
                              @if (q.expiryDate) {
                                &middot; Expires {{ fmt(q.expiryDate) }}
                              }
                            </div>
                          </div>
                          @if (certBadge(q); as b) {
                            <span class="ep-badge ep-{{ b.cls }}">{{
                              b.label
                            }}</span>
                            @if (!readonly() && b.cls === 'muted') {
                              <a class="ep-link" (click)="editQual(q)"
                                >Add expiry date</a
                              >
                            }
                          }
                          @if (!readonly()) {
                            <div class="ep-btns">
                              <button
                                class="ep-btn"
                                type="button"
                                [disabled]="
                                  busyKey() ===
                                  'qual:' + q.employeeQualificationId
                                "
                                (click)="editQual(q)"
                              >
                                Edit
                              </button>
                              <button
                                class="ep-btn ep-btn-danger"
                                type="button"
                                [disabled]="
                                  busyKey() ===
                                  'qual:' + q.employeeQualificationId
                                "
                                (click)="removeQual(q)"
                              >
                                Delete
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            }
          </div>
        }
      }
    </div>

    <style>
      .ep-page {
        max-width: 1100px;
      }
      .ep-back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-muted);
        cursor: pointer;
        margin-bottom: 14px;
      }
      .ep-back:hover {
        color: var(--navy);
      }
      .ep-pagetitle {
        font-size: 30px;
        font-weight: 800;
        color: var(--text);
      }
      .ep-pagesub {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 2px;
        margin-bottom: 20px;
      }

      /* Pill tab bar */
      .ep-tabs {
        display: inline-flex;
        gap: 2px;
        max-width: 100%;
        overflow-x: auto;
        background: var(--surface-2);
        border-radius: 12px;
        padding: 4px;
        margin-bottom: 20px;
      }
      .ep-tab {
        border: 0;
        background: transparent;
        border-radius: 9px;
        padding: 8px 12px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
        white-space: nowrap;
        cursor: pointer;
      }
      .ep-tab:hover:not(.active) {
        background: rgba(255, 255, 255, 0.6);
      }
      .ep-tab.active {
        background: #fff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      }
      .ep-tab:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }

      /* Card */
      .ep-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
      }
      .ep-cardhead {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .ep-h {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      .ep-hint {
        font-size: 12.5px;
        color: var(--text-muted);
        margin: -8px 0 14px;
      }
      .ep-subh {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 10px;
      }

      /* Locked details */
      .ep-locked {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 14px;
        background: #fafafa;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
      }
      .ep-k {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
      }
      .ep-v {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        margin-top: 2px;
        word-break: break-word;
      }
      .ep-v i {
        font-size: 13px;
        color: var(--text-muted);
      }
      .ep-note {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 10px;
      }
      .ep-personal {
        margin-top: 20px;
      }

      /* Forms */
      .ep-form {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 14px;
        background: #fafafa;
        scroll-margin-top: 16px;
      }
      .ep-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .ep-span {
        grid-column: span 2;
      }
      .ep-field label {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .ep-input {
        width: 100%;
        box-sizing: border-box;
        padding: 9px 10px;
        font: inherit;
        font-size: 13px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
      }
      .ep-input:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .ep-input:disabled {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .ep-field-error {
        font-size: 12px;
        color: #b3261e;
        margin-top: 3px;
      }
      .ep-banner {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 13px;
        background: #fdecea;
        color: #b3261e;
      }
      .ep-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 12px;
      }
      .ep-addrow {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ep-level {
        width: 150px;
        flex-shrink: 0;
      }
.ep-combo {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.ep-suggest {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  margin: 4px 0 0;
  padding: 4px;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
}
.ep-suggest li {
  padding: 8px 10px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
}
.ep-suggest li:hover {
  background: var(--surface-2);
}
.ep-nomatch {
  padding: 8px 10px;
  font-size: 13px;
  color: var(--text-muted);
}
      /* List items */
      .ep-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ep-item {
        background: #fafafa;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
      }
      .ep-itemhead {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        flex-wrap: wrap;
      }
      .ep-itemrow {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .ep-grow {
        flex: 1;
        min-width: 0;
      }
      .ep-itemtitle {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
      }
      .ep-company {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .ep-period {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .ep-lbl {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        margin-top: 14px;
      }
      .ep-text {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 2px;
        white-space: pre-line;
      }
      .ep-btns {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      .ep-btn {
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 6px 14px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
        cursor: pointer;
      }
      .ep-btn:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .ep-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .ep-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .ep-btn-danger:hover:not(:disabled) {
        color: #b3261e;
        border-color: #b3261e;
        background: #fff;
      }
      .ep-chip {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 20px;
        background: var(--surface-2);
        color: var(--text);
      }
      .ep-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
        white-space: nowrap;
      }
      .ep-ok {
        background: #e8f5e9;
        color: #1a5c35;
      }
      .ep-warn {
        background: #fff3e0;
        color: #8a5a00;
      }
      .ep-bad {
        background: #fdecea;
        color: #b3261e;
      }
      .ep-muted {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .ep-link {
        font-size: 12px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        white-space: nowrap;
      }
      .ep-empty {
        font-size: 13px;
        color: var(--text-muted);
        padding: 8px 0;
      }
      .ep-spin {
        display: inline-block;
      }
      .ep-spin ::ng-deep circle {
        stroke: #fff;
      }

      /* Skills tab: two cards side by side */
      .ep-skillgrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
        align-items: start;
      }
      .ep-skilllist {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ep-skillrow {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--surface-2);
        border-radius: 8px;
        padding: 9px 8px 9px 12px;
      }
      .ep-skillrow select.ep-lvl {
  width: 120px;
  flex: 0 0 120px;
}
     .ep-skillname {
  flex: 1 1 0;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  overflow-wrap: anywhere;
}
.ep-lvl {
  border: 0;
  border-radius: 6px;
  padding: 3px 9px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  flex: 0 0 auto;
}
select.ep-lvl {
  width: 120px;       /* beats any global select { width: 100% } */
  cursor: pointer;
}
      select.ep-lvl:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      select.ep-lvl:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .ep-lvl option {
        color: #1a1a1a;
        background: #fff;
      }
      .ep-lvl-Expert {
        background: #0f6b3a;
      }
      .ep-lvl-Intermediate {
        background: #2b2f7e;
      }
      .ep-lvl-Beginner {
        background: #6f6f80;
      }
      .ep-icon-btn {
        border: 0;
        background: none;
        cursor: pointer;
        font-size: 16px;
        color: var(--text-muted);
        padding: 4px;
        border-radius: 6px;
        line-height: 1;
      }
      .ep-icon-btn:hover:not(:disabled) {
        background: #fff;
        color: #b3261e;
      }
      .ep-icon-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .ep-icon-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }

      @media (max-width: 560px) {
        .ep-pagetitle {
          font-size: 24px;
        }
        .ep-card {
          padding: 16px;
        }
        .ep-grid {
          grid-template-columns: 1fr;
        }
        .ep-span {
          grid-column: span 1;
        }
        .ep-level {
          width: 100%;
        }
        .ep-cardhead {
          flex-wrap: wrap;
        }
      }
      @media (max-width: 760px) {
        .ep-skillgrid {
          grid-template-columns: 1fr;
        }
         .ep-skillrow {
    flex-wrap: wrap;
  }
  .ep-skillname {
    flex-basis: 100%;
  }
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

  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'personal', label: 'Personal Information' },
    { id: 'experience', label: 'Experience' },
    { id: 'skills', label: 'Skills & Competencies' },
    { id: 'qualifications', label: 'Qualifications' },
    { id: 'certifications', label: 'Certifications' },
  ];
  tab = signal<TabId>('personal');

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
  skillFormFor = signal<SkillGroup | null>(null); // which card's add form is open
 skillQuery = signal('');
skillOpen = signal(false);
skillLevel = PROFICIENCY_LEVELS[0];
  skillSaving = signal(false);
  skillError = signal<string | null>(null);

  // Skills offered by the open add form: only the card's own category (falls back to all
  // if the skill list carries no category)
  availableForForm = computed(() => {
    const group = this.skillFormFor();
    const all = this.availableSkills();
    if (!group || !all.some((s) => this.catOf(s))) return all;
    return all.filter(
      (s) => (this.catOf(s) === 'SoftSkill') === (group === 'SoftSkill'),
    );
  });
  skillMatches = computed(() => {
  const q = this.skillQuery().trim().toLowerCase();
  const list = this.availableForForm();
  return (q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list).slice(0, 8);
});
  technicalSkills = computed(() =>
    (this.profile()?.skills ?? []).filter((s) => s.category !== 'SoftSkill'),
  );
  softSkills = computed(() =>
    (this.profile()?.skills ?? []).filter((s) => s.category === 'SoftSkill'),
  );

  // ── Qualifications (Education tab) and certifications (Certifications tab) ──
  qForm = {
    type: 'Certification' as QualificationType,
    name: '',
    institution: '',
    yearCompleted: '',
    expiryDate: '',
  };
  qFormOpen = signal(false);
  qEditingId = signal<number | null>(null);
  qSubmitted = signal(false);
  qSaving = signal(false);
  qError = signal<string | null>(null);

  educationList = computed(() =>
    (this.profile()?.qualifications ?? []).filter(
      (q) => q.qualificationType === 'Education',
    ),
  );
  certificationList = computed(() =>
    (this.profile()?.qualifications ?? []).filter(
      (q) => q.qualificationType === 'Certification',
    ),
  );

  // ── Work history ──
  xForm = { company: '', role: '', startDate: '', endDate: '', duties: '' };
  xFormOpen = signal(false);
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

  // ───────────── Tabs ─────────────

  selectTab(id: TabId): void {
    if (id === this.tab()) return;
    // Leaving a tab drops any form that was open on it
    this.resetQual();
    this.resetExp();
    this.closeSkillForm();
    this.tab.set(id);
  }

  // Dashboard links: ?section=personal|work|skills|qualifications|certifications, ?editQual=<id>
  private applyDeepLink(p: EmployeeProfileResponse): void {
    const qp = this.route.snapshot.queryParamMap;

    const editId = Number(qp.get('editQual'));
    if (editId) {
      const q = p.qualifications.find(
        (x) => x.employeeQualificationId === editId,
      );
      if (q) {
        this.editQual(q);
        return;
      }
    }

    const sectionToTab: Record<string, TabId> = {
      personal: 'personal',
      work: 'experience',
      experience: 'experience',
      skills: 'skills',
      qualifications: 'qualifications',
      certifications: 'certifications',
    };
    const target = sectionToTab[qp.get('section') ?? ''];
    if (target) this.tab.set(target);
  }

  private scrollToId(id: string): void {
    // Wait a tick so the form has rendered after the signals were set.
    setTimeout(
      () =>
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
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
    if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d))
      age--;
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
        if (v.dateOfBirth > this.today)
          return 'Date of birth can\u2019t be in the future.';
        return this.ageOn(v.dateOfBirth) < 18
          ? 'You must be at least 18 years old.'
          : null;
      case 'nationality':
        return v.nationality.trim().length > 50
          ? 'Maximum 50 characters.'
          : null;
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
        this.pError.set(
          this.errMsg(err, 'Could not save your personal details.'),
        );
      },
    });
  }

  // ───────────── Skills ─────────────

  catLabel(c: string): string {
    return c === 'SoftSkill' ? 'Soft skill' : c;
  }

  private catOf(s: SkillOption): string {
    return (s as { category?: string }).category ?? '';
  }

  openSkillForm(group: SkillGroup): void {
    this.closeSkillForm();
    this.skillFormFor.set(group);
  }

onSkillInput(v: string): void {
  this.skillQuery.set(v);
  this.skillError.set(null);
  this.skillOpen.set(true);
}

pickSkill(s: SkillOption): void {
  this.skillQuery.set(s.name);
  this.skillOpen.set(false);
  this.skillError.set(null);
}

closeSkillForm(): void {
  this.skillFormFor.set(null);
  this.skillQuery.set('');
  this.skillOpen.set(false);
  this.skillLevel = PROFICIENCY_LEVELS[0];
  this.skillError.set(null);
}
  submitSkill(): void {
    if (this.skillSaving()) return;
const q = this.skillQuery().trim().toLowerCase();    const skill = this.availableForForm().find(
      (s) => s.name.toLowerCase() === q,
    );
    if (!skill) {
      this.skillError.set(
        q ? 'Choose a skill from the list.' : 'Enter a skill.',
      );
      return;
    }
    this.skillSaving.set(true);
    this.api
      .addSkill({ skillId: skill.skillId, proficiencyLevel: this.skillLevel })
      .subscribe({
        next: (dto) => {
          this.patch((p) => ({
            ...p,
            skills: [...p.skills, dto].sort((a, b) =>
              a.skillName.localeCompare(b.skillName),
            ),
          }));
          this.closeSkillForm();
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
          skills: p.skills.map((x) =>
            x.employeeSkillId === s.employeeSkillId ? { ...x, ...dto } : x,
          ),
        }));
        this.busyKey.set(null);
      },
      error: (err) => {
        select.value = s.proficiencyLevel; // revert the control
        this.busyKey.set(null);
        this.toast.show(
          this.errMsg(err, 'Could not update the level.'),
          'error',
        );
      },
    });
  }

  removeSkill(s: EmployeeSkillDto): void {
    if (!confirm(`Remove ${s.skillName} from your skills?`)) return;
    this.busyKey.set('skill:' + s.employeeSkillId);
    this.api.deleteSkill(s.employeeSkillId).subscribe({
      next: () => {
        this.patch((p) => ({
          ...p,
          skills: p.skills.filter(
            (x) => x.employeeSkillId !== s.employeeSkillId,
          ),
        }));
        this.busyKey.set(null);
        this.toast.show(`${s.skillName} removed.`, 'success');
      },
      error: (err) => {
        this.busyKey.set(null);
        this.toast.show(
          this.errMsg(err, 'Could not remove the skill.'),
          'error',
        );
      },
    });
  }

  // ───────────── Qualifications and certifications ─────────────

  qFieldError(f: QualField): string | null {
    if (!this.qSubmitted()) return null;
    const v = this.qForm;
    switch (f) {
      case 'name': {
        const n = v.name.trim();
        return !n
          ? 'Enter a name.'
          : n.length > 200
            ? 'Maximum 200 characters.'
            : null;
      }
      case 'institution': {
        const n = v.institution.trim();
        return !n
          ? v.type === 'Certification'
            ? 'Enter the issuing body.'
            : 'Enter the institution.'
          : n.length > 200
            ? 'Maximum 200 characters.'
            : null;
      }
      case 'yearCompleted':
        if (!v.yearCompleted) return 'Choose a date.';
        return v.yearCompleted > this.today
          ? 'The date can\u2019t be in the future.'
          : null;
      case 'expiryDate':
        if (v.type !== 'Certification' || !v.expiryDate) return null;
        return v.expiryDate <= v.yearCompleted
          ? 'Expiry date must be after the issue date.'
          : null;
    }
  }

  private qualHasErrors(): boolean {
    const fields: QualField[] = [
      'name',
      'institution',
      'yearCompleted',
      'expiryDate',
    ];
    return fields.some((f) => !!this.qFieldError(f));
  }

  // The tab decides the type: Qualifications adds Education, Certifications adds Certification.
  openAddQual(type: QualificationType): void {
    this.resetQual();
    this.qForm.type = type;
    this.qFormOpen.set(true);
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
    this.tab.set(
      q.qualificationType === 'Certification'
        ? 'certifications'
        : 'qualifications',
    );
    this.qFormOpen.set(true);
    this.scrollToId('ep-qform');
  }

  // Clears the form and closes it (used by Cancel, after a save, and when leaving the tab)
  resetQual(): void {
    this.qForm = {
      type: 'Certification',
      name: '',
      institution: '',
      yearCompleted: '',
      expiryDate: '',
    };
    this.qEditingId.set(null);
    this.qSubmitted.set(false);
    this.qError.set(null);
    this.qFormOpen.set(false);
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
      expiryDate:
        v.type === 'Certification' && v.expiryDate ? v.expiryDate : null,
    };
    const id = this.qEditingId();
    const call$ = id
      ? this.api.updateQualification(id, body)
      : this.api.addQualification(body);
    const label =
      v.type === 'Certification' ? 'Certification' : 'Qualification';

    this.qSaving.set(true);
    this.qError.set(null);
    call$.subscribe({
      next: (dto) => {
        this.patch((p) => {
          const list = id
            ? p.qualifications.map((x) =>
                x.employeeQualificationId === id ? dto : x,
              )
            : [...p.qualifications, dto];
          list.sort((a, b) => b.yearCompleted.localeCompare(a.yearCompleted));
          return { ...p, qualifications: list };
        });
        this.qSaving.set(false);
        this.resetQual();
        this.toast.show(
          id ? `${label} updated.` : `${label} added.`,
          'success',
        );
      },
      error: (err) => {
        this.qSaving.set(false);
        this.qError.set(this.errMsg(err, 'Could not save. Try again.'));
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
          qualifications: p.qualifications.filter(
            (x) => x.employeeQualificationId !== q.employeeQualificationId,
          ),
        }));
        if (this.qEditingId() === q.employeeQualificationId) this.resetQual();
        this.busyKey.set(null);
        this.toast.show(
          q.qualificationType === 'Certification'
            ? 'Certification deleted.'
            : 'Qualification deleted.',
          'success',
        );
      },
      error: (err) => {
        this.busyKey.set(null);
        this.toast.show(
          this.errMsg(err, 'Could not delete. Try again.'),
          'error',
        );
      },
    });
  }

  // Status comes from the server; days remaining is only for the label.
  certBadge(
    q: EmployeeQualificationDto,
  ): { label: string; cls: string } | null {
    if (q.qualificationType !== 'Certification') return null;
    switch (q.certificationStatus) {
      case 'Expired': {
        const n = q.expiryDate ? this.daysUntil(q.expiryDate) : null;
        if (n === null) return { label: 'Expired', cls: 'bad' };
        const days = Math.abs(n);
        return {
          label:
            days === 0
              ? 'Expired today'
              : `Expired ${days} day${days === 1 ? '' : 's'} ago`,
          cls: 'bad',
        };
      }
      case 'Expiring': {
        const n = q.expiryDate ? this.daysUntil(q.expiryDate) : null;
        return {
          label:
            n !== null
              ? `Expires in ${n} day${n === 1 ? '' : 's'}`
              : 'Expiring',
          cls: 'warn',
        };
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
        return !n
          ? 'Enter the company.'
          : n.length > 200
            ? 'Maximum 200 characters.'
            : null;
      }
      case 'role': {
        const n = v.role.trim();
        return !n
          ? 'Enter the role.'
          : n.length > 150
            ? 'Maximum 150 characters.'
            : null;
      }
      case 'startDate':
        if (!v.startDate) return 'Choose a start date.';
        return v.startDate > this.today
          ? 'Start date can\u2019t be in the future.'
          : null;
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

  openAddExp(): void {
    this.resetExp();
    this.xFormOpen.set(true);
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
    this.xFormOpen.set(true);
    this.scrollToId('ep-xform');
  }

  // Clears the form and closes it (used by Cancel, after a save, and when leaving the tab)
  resetExp(): void {
    this.xForm = {
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      duties: '',
    };
    this.xEditingId.set(null);
    this.xSubmitted.set(false);
    this.xError.set(null);
    this.xFormOpen.set(false);
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
    const call$ = id
      ? this.api.updateExperience(id, body)
      : this.api.addExperience(body);

    this.xSaving.set(true);
    this.xError.set(null);
    call$.subscribe({
      next: (dto) => {
        this.patch((p) => {
          const list = id
            ? p.experiences.map((x) =>
                x.employeeExperienceId === id ? dto : x,
              )
            : [...p.experiences, dto];
          list.sort((a, b) => b.startDate.localeCompare(a.startDate));
          return { ...p, experiences: list };
        });
        this.xSaving.set(false);
        this.resetExp();
        this.toast.show(
          id ? 'Work history updated.' : 'Work history added.',
          'success',
        );
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
          experiences: p.experiences.filter(
            (e) => e.employeeExperienceId !== x.employeeExperienceId,
          ),
        }));
        if (this.xEditingId() === x.employeeExperienceId) this.resetExp();
        this.busyKey.set(null);
        this.toast.show('Work history deleted.', 'success');
      },
      error: (err) => {
        this.busyKey.set(null);
        this.toast.show(
          this.errMsg(err, 'Could not delete the work history.'),
          'error',
        );
      },
    });
  }

  // ───────────── Helpers ─────────────

  private patch(
    fn: (p: EmployeeProfileResponse) => EmployeeProfileResponse,
  ): void {
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

  fmt(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  monthYear(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      month: 'short',
      year: 'numeric',
    });
  }
  yearOf(d: string): string {
    return String(new Date(d).getFullYear());
  }

  // "1 year 5 months" between the start date and the end date (or today if still employed)
  duration(start: string, end?: string | null): string {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    let months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) months--;
    months = Math.max(0, months);
    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts: string[] = [];
    if (y) parts.push(`${y} year${y === 1 ? '' : 's'}`);
    if (m) parts.push(`${m} month${m === 1 ? '' : 's'}`);
    return parts.length ? parts.join(' ') : 'Less than a month';
  }

  goBack(): void {
    this.location.back();
  }
}
