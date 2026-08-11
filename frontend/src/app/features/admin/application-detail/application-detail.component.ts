import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApplicationService } from '../../../core/services/application.service';
import { CandidateService } from '../../../core/services/candidate.service';
import { DocumentService, DOCUMENT_TYPE_LABELS } from '../../../core/services/document.service';
import { CandidateSkillService } from '../../../core/services/candidate-skill.service';
import { CandidateExperienceService } from '../../../core/services/candidate-experience.service';
import { CandidateQualificationService } from '../../../core/services/candidate-qualification.service';
import { ToastService } from '../../../core/services/toast.service';
import { PrescreeningService, PrescreeningResponse, PrescreeningTemplateResponse, PrescreeningOutcome, validatePrescreeningFile } from '../../../core/services/prescreening.service';
import { OfferLetterService, OfferLetterResponse } from '../../../core/services/offer-letter.service';
import { VacancyService } from '../../../core/services/vacancy.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import {
  ApplicationResponse, CandidateResponse, CandidateDocumentResponse,
  CandidateSkillResponse, ExperienceResponse, QualificationResponse, VacancyResponse
} from '../../../core/models';
import { getValidNextStatuses, STATUS_LABELS, ApplicationStatusKey } from '../../../core/utils/application-status';

const STATUS_CLASS: Record<string, string> = {
  Applied: 'applied', UnderReview: 'shortlisted', Shortlisted: 'prescreen',
  PrescreeningStage: 'interview', InterviewStage: 'interview',
  OfferExtended: 'offer', Hired: 'offer', NotSelected: 'rejected',
  OfferSent: 'offer', OfferAccepted: 'offer', OfferDeclined: 'rejected'
};

type PreviewKind = 'pdf' | 'image' | 'text' | 'unsupported';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MatCardModule, MatSelectModule,
    MatFormFieldModule, MatButtonModule, MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container ad-page">
      <a routerLink="/admin/applications" class="back-link">
        <i class="ti ti-arrow-left"></i> Back to applications
      </a>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      } @else if (application()) {
        @if (application(); as app) {

        <!-- Header -->
        <div class="ad-header">
          <div class="ad-avatar">{{ initials(app.candidateName) }}</div>
          <div class="ad-header-info">
            <div class="ad-name">{{ app.candidateName }}</div>
            <div class="ad-sub">
              <i class="ti ti-briefcase"></i>
              Applied for <strong>{{ app.vacancyTitle }}</strong>
              <span class="ad-sub-dot">·</span>
              <i class="ti ti-calendar"></i>
              {{ formatDate(app.appliedAt) }}
            </div>
          </div>
          <span class="status-pill-lg s-{{ statusClass(effectiveStatus()) }}">
            <span class="status-dot"></span>{{ label(effectiveStatus()) }}
          </span>
        </div>

        <div class="ad-grid">
          <!-- LEFT: candidate profile -->
          <div class="ad-col">

            <mat-card class="mat-elevation-z1 ad-card">
              <div class="vd-section-label">Candidate details</div>
              @if (candidate(); as c) {
                <div class="kv-grid" style="margin-top:10px">
                  <div class="kv"><span class="kv-icon"><i class="ti ti-mail"></i></span><div><span class="kv-label">Email</span><span class="kv-val">{{ c.email }}</span></div></div>
                  <div class="kv"><span class="kv-icon"><i class="ti ti-phone"></i></span><div><span class="kv-label">Phone</span><span class="kv-val">{{ c.phone || '—' }}</span></div></div>
                  <div class="kv"><span class="kv-icon"><i class="ti ti-gender-bigender"></i></span><div><span class="kv-label">Gender</span><span class="kv-val">{{ c.gender || '—' }}</span></div></div>
                  <div class="kv"><span class="kv-icon"><i class="ti ti-flag"></i></span><div><span class="kv-label">Nationality</span><span class="kv-val">{{ c.nationality || '—' }}</span></div></div>
                  <div class="kv"><span class="kv-icon"><i class="ti ti-cake"></i></span><div><span class="kv-label">Date of birth</span><span class="kv-val">{{ c.dateOfBirth ? formatDate(c.dateOfBirth) : '—' }}</span></div></div>
                  <div class="kv"><span class="kv-icon"><i class="ti ti-calendar-event"></i></span><div><span class="kv-label">Registered</span><span class="kv-val">{{ formatDate(c.registeredAt) }}</span></div></div>
                </div>
              } @else {
                <p class="form-note" style="margin-top:8px">Candidate profile unavailable.</p>
              }

              <mat-divider style="margin:18px 0"></mat-divider>

              <div class="vd-section-label">Experience</div>
              @if (experience().length) {
                <div class="exp-list" style="margin-top:10px">
                  @for (e of experience(); track e.candidateExperienceId) {
                    <div class="exp-row">
                      <span class="exp-icon"><i class="ti ti-briefcase-2"></i></span>
                      <div class="exp-body">
                        <div class="exp-role">{{ e.role }} <span class="exp-at">at {{ e.company }}</span></div>
                        <div class="exp-dates"><i class="ti ti-calendar"></i>{{ formatDate(e.startDate) }} – {{ e.endDate ? formatDate(e.endDate) : 'Present' }}</div>
                        @if (e.projectsAndDuties) { <div class="exp-notes">{{ e.projectsAndDuties }}</div> }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="form-note" style="margin-top:8px">No experience captured.</p>
              }

              <mat-divider style="margin:18px 0"></mat-divider>

              <div class="vd-section-label">Qualifications</div>
              @if (qualifications().length) {
                <div class="qual-list" style="margin-top:10px">
                  @for (q of qualifications(); track q.candidateQualificationId) {
                    <div class="qual-row">
                      <span class="qual-icon">
                        <i class="ti" [class.ti-certificate]="q.qualificationType === 'Certification'" [class.ti-books]="q.qualificationType !== 'Certification'"></i>
                      </span>
                      <div>
                        <div class="qual-name">{{ q.name }}</div>
                        <div class="qual-sub">{{ q.institution }} · {{ formatDate(q.yearCompleted) }}</div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="form-note" style="margin-top:8px">No qualifications captured.</p>
              }

              <mat-divider style="margin:18px 0"></mat-divider>

              <div class="vd-section-label">Skills</div>
              @if (skills().length) {
                <div class="skill-chips" style="margin-top:10px">
                  @for (s of skills(); track s.candidateSkillId) {
                    <span class="skill-chip"><span class="skill-dot" [ngClass]="skillClass(s.proficiencyLevel)"></span>{{ s.skillName }}<span class="skill-level">{{ s.proficiencyLevel }}</span></span>
                  }
                </div>
              } @else {
                <p class="form-note" style="margin-top:8px">No skills captured.</p>
              }

              <mat-divider style="margin:18px 0"></mat-divider>

              <div class="vd-section-label">Submitted documents</div>
              @if (documents().length) {
                <div class="doc-list" style="margin-top:10px">
                  @for (d of documents(); track d.candidateDocumentId) {
                    <div class="doc-row">
                      <span class="doc-icon"><i class="ti ti-file-text"></i></span>
                      <div class="doc-meta">
                        <div class="doc-name">{{ docLabel(d.documentType) }}</div>
                        <div class="doc-sub">{{ d.originalFileName }} · uploaded {{ formatDate(d.uploadedAt) }}</div>
                      </div>
                      <a class="btn-secondary doc-view-btn" [href]="fileHref(d.fileUrl)" target="_blank" rel="noopener">
                        <i class="ti ti-eye"></i> View
                      </a>
                    </div>
                  }
                </div>
              } @else {
                <p class="form-note" style="margin-top:8px">No documents on file.</p>
              }
            </mat-card>
          </div>

          <!-- RIGHT: pre-screening + offer letter + status actions -->
          <div class="ad-col">

            <mat-card class="mat-elevation-z1 ad-card">
              <div class="ps-header">
                <div>
                  <div class="vd-title-sm">Pre-screening assessment</div>
                  <div class="vd-ref">Candidate-submitted screening documentation</div>
                </div>
                @if (doc(); as d) {
                  <span class="pill" [class.pill-pub]="d.status === 'Submitted'" [class.pill-dept]="d.status === 'Sent'" [class.pill-type]="d.status === 'Reviewed'">
                    {{ d.status === 'Reviewed' ? d.outcome : (d.status === 'Submitted' ? 'Submitted' : 'Awaiting upload') }}
                  </span>
                }
              </div>

              <!-- Template management -->
              <div class="tmpl-row">
                @if (template(); as t) {
                  <span class="form-note"><i class="ti ti-file-text"></i> Template: <a [href]="fileHref(t.fileUrl)" target="_blank" rel="noopener">{{ t.originalFileName }}</a></span>
                } @else {
                  <span class="form-note"><i class="ti ti-alert-triangle"></i> No pre-screening template has been uploaded yet.</span>
                }
                <input type="file" class="ps-file-input" id="tmpl-file" accept=".pdf,.doc,.docx" (change)="onTemplateFileSelected($event)">
                <label class="btn-secondary tmpl-upload-btn" for="tmpl-file">
                  @if (uploadingTemplate()) { <mat-spinner diameter="14"></mat-spinner> } @else { <i class="ti ti-upload"></i> }
                  {{ template() ? 'Replace' : 'Upload template' }}
                </label>
              </div>

              @if (psLoading()) {
                <div class="empty-state" style="padding: 1.5rem 0"><mat-spinner diameter="24"></mat-spinner></div>
              } @else if (!doc()) {
                <div class="empty-state" style="padding: 1.5rem 0">
                  <i class="ti ti-clipboard-off"></i>
                  <p>No pre-screening assessment has been sent for this application yet.</p>
                </div>
                @if (app.status === 'Shortlisted') {
                  <div class="ps-actions" style="padding-bottom:4px">
                    <button class="btn-primary" [disabled]="sendingPrescreening()" (click)="sendPrescreening()">
                      @if (sendingPrescreening()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-send-2"></i> }
                      Send pre-screening form
                    </button>
                  </div>
                } @else {
                  <p class="form-note"><i class="ti ti-info-circle"></i> A pre-screening form can only be sent once the candidate is Shortlisted.</p>
                }
              } @else {
                <div class="vc-meta" style="margin-top:14px">
                  <span><i class="ti ti-send-2"></i> Sent {{ formatDateTime(doc()!.sentAt) }}</span>
                  @if (doc()!.status !== 'Sent') {
                    <span><i class="ti ti-circle-check"></i> Received {{ formatDateTime(doc()!.submittedAt!) }}</span>
                  } @else {
                    <span><i class="ti ti-hourglass"></i> Not yet received</span>
                  }
                </div>

                <mat-divider style="margin:16px 0"></mat-divider>

                @if (doc()!.status !== 'Sent') {
                  <div class="vd-section-label">Submitted document</div>
                  <div class="doc-row" style="margin-top:10px">
                    <span class="doc-icon"><i class="ti ti-file-description"></i></span>
                    <div class="doc-meta">
                      <div class="doc-name">{{ doc()!.completedOriginalFileName }}</div>
                      <div class="doc-sub">Submitted assessment document</div>
                    </div>
                    <div style="display:flex;gap:8px;flex-shrink:0">
                      <button class="btn-secondary doc-view-btn" (click)="openPreview()"><i class="ti ti-eye"></i> View</button>
                      <a class="btn-secondary doc-view-btn" [href]="fileHref(doc()!.completedFileUrl!)" [download]="doc()!.completedOriginalFileName">
                        <i class="ti ti-download"></i> Download
                      </a>
                    </div>
                  </div>

                  @if (doc()!.status === 'Submitted') {
                    <div class="vd-section-label" style="margin-top:20px">Assessment</div>
                    <div class="assess-toggle">
                      <button type="button" class="assess-btn assess-pass" [class.active]="assessmentDraftResult() === 'Passed'" (click)="setAssessmentResult('Passed')">
                        <i class="ti ti-circle-check"></i> Pass
                      </button>
                      <button type="button" class="assess-btn assess-fail" [class.active]="assessmentDraftResult() === 'Failed'" (click)="setAssessmentResult('Failed')">
                        <i class="ti ti-circle-x"></i> Fail
                      </button>
                    </div>
                    <textarea class="assess-comment" rows="3" placeholder="Add a comment about this candidate's assessment (optional)…"
                              [ngModel]="assessmentDraftComment()" (ngModelChange)="assessmentDraftComment.set($event)"></textarea>
                    <div class="assess-footer">
                      <span class="form-note"><i class="ti ti-info-circle"></i> Not assessed yet</span>
                      <button class="btn-primary" [disabled]="!assessmentDraftResult() || savingAssessment()" (click)="saveAssessment()">
                        @if (savingAssessment()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-device-floppy"></i> }
                        Save assessment
                      </button>
                    </div>
                  } @else {
                    <div class="vd-section-label" style="margin-top:20px">Assessment</div>
                    <p class="form-note">
                      <i class="ti" [class.ti-circle-check]="doc()!.outcome === 'Passed'" [class.ti-circle-x]="doc()!.outcome === 'Failed'"></i>
                      Reviewed as <strong>{{ doc()!.outcome }}</strong>@if (doc()!.reviewedAt) { on {{ formatDateTime(doc()!.reviewedAt!) }} }
                    </p>
                    @if (doc()!.recruiterNotes) {
                      <p class="form-note" style="white-space:pre-line">{{ doc()!.recruiterNotes }}</p>
                    }
                  }
                } @else {
                  <p class="form-note"><i class="ti ti-hourglass"></i> The candidate hasn't uploaded their completed assessment yet.</p>
                }
              }

              @if (app.status === 'OfferExtended' || offer()) {
                <mat-divider style="margin:18px 0"></mat-divider>

                <div class="vd-section-label">Offer letter</div>
                <div style="margin-top:10px">
                  @if (!offer()) {
                    <p class="form-note">No offer letter has been generated for this application yet.</p>
                  } @else {
                    <span class="pill" [class.pill-pub]="offer()!.status === 'Sent' || offer()!.status === 'Accepted'"
                          [class.pill-type]="offer()!.status === 'Declined'"
                          style="margin-bottom:14px;display:inline-flex">
                      {{ offer()!.status }}
                    </span>
                    <p class="form-note" style="margin-bottom:14px">{{ offer()!.jobTitle }} · {{ offer()!.location || '—' }}</p>
                    @if (offer()!.status === 'Sent') {
                      <p class="form-note" style="margin-bottom:14px"><i class="ti ti-hourglass"></i> Waiting for the candidate to accept or decline the offer.</p>
                    } @else if (offer()!.status === 'Accepted') {
                      <p class="form-note" style="margin-bottom:14px;color:#1a5c35"><i class="ti ti-circle-check"></i> The candidate has accepted the offer.</p>
                    } @else if (offer()!.status === 'Declined') {
                      <p class="form-note" style="margin-bottom:14px;color:var(--red)"><i class="ti ti-circle-x"></i> The candidate has declined the offer.</p>
                    }
                  }

                  <a class="btn-primary" style="text-decoration:none;display:inline-flex"
                     [routerLink]="['/admin/applications', app.applicationId, 'offer']">
                    <i class="ti ti-file-certificate"></i>
                    {{ offer() ? 'View offer letter' : 'Generate offer letter' }}
                  </a>
                </div>
              }

              <mat-divider style="margin:18px 0"></mat-divider>

              <div class="vd-section-label">Move application forward</div>
              <div style="margin-top:10px">
                @if (nextOptions().length) {
                  <mat-form-field appearance="outline" class="compact-select move-select">
                    <mat-label>Move to</mat-label>
                    <mat-select [(ngModel)]="pendingStatus">
                      @for (s of nextOptions(); track s) {
                        <mat-option [value]="s">{{ label(s) }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-raised-button color="primary" class="move-btn"
                          [disabled]="!pendingStatus || updating()" (click)="updateStatus()">
                    @if (updating()) {
                      <mat-spinner diameter="16" class="move-btn-spinner"></mat-spinner>
                    } @else {
                      <i class="ti ti-arrow-right"></i>
                    }
                    Update status
                  </button>
                } @else {
                  <p class="form-note"><i class="ti ti-lock"></i> This is a final stage — no further moves are possible.</p>
                }
              </div>
            </mat-card>
          </div>
        </div>
        }
      }
    </div>

    @if (previewOpen()) {
      <div class="ps-modal-backdrop" (click)="closePreview()">
        <div class="ps-modal" (click)="$event.stopPropagation()">
          <div class="ps-modal-header">
            <div><i class="ti ti-file-description"></i> {{ doc()?.completedOriginalFileName }}</div>
            <button class="ps-modal-close" (click)="closePreview()"><i class="ti ti-x"></i></button>
          </div>
          <div class="ps-modal-body">
            @if (previewKind() === 'pdf') {
              <iframe [src]="previewUrl()" class="ps-modal-iframe"></iframe>
            } @else {
              <div class="empty-state">
                <i class="ti ti-file-unknown"></i>
                <p>Preview isn't available for this file type. Download it to view the contents.</p>
              </div>
            }
          </div>
          <div class="ps-modal-footer">
            <button class="btn-secondary" (click)="closePreview()">Close</button>
            <a class="btn-primary" [href]="doc() ? fileHref(doc()!.completedFileUrl!) : ''" [download]="doc()?.completedOriginalFileName">
              <i class="ti ti-download"></i> Download
            </a>
          </div>
        </div>
      </div>
    }

    <style>
      .ad-page { max-width: 1120px; }

      .back-link { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 16px; }

      /* ── Header ── */
      .ad-header {
        display: flex; align-items: center; gap: 18px; margin-bottom: 22px;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
        padding: 22px 26px; box-shadow: var(--shadow-sm);
      }
      .ad-avatar {
        width: 58px; height: 58px; border-radius: 50%;
        background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 700; letter-spacing: 0.02em; flex-shrink: 0;
        box-shadow: 0 3px 12px rgba(26,39,68,0.35);
      }
      .ad-header-info { flex: 1; min-width: 0; }
      .ad-name { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; }
      .ad-sub {
        font-size: 13px; color: var(--text-muted); margin-top: 4px;
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
      }
      .ad-sub i { font-size: 13px; color: var(--text-muted); }
      .ad-sub strong { color: var(--text); font-weight: 600; }
      .ad-sub-dot { color: rgba(0,0,0,0.2); margin: 0 2px; }

      .status-pill-lg {
        font-size: 12px; font-weight: 700; padding: 8px 16px 8px 12px; border-radius: 20px;
        white-space: nowrap; display: inline-flex; align-items: center; gap: 7px; letter-spacing: 0.02em;
        flex-shrink: 0;
      }
      .status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

      /* ── Layout ── */
      .ad-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 18px; align-items: start; }
      @media (max-width: 860px) { .ad-grid { grid-template-columns: 1fr; } }
      .ad-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

      .ad-card { border-radius: 14px !important; padding: 20px 22px; }
      .ad-card ::ng-deep .mat-mdc-card-content { padding: 0; }

      /* ── Section headers ── */
      .sec-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
      .sec-icon {
        width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
        background: var(--surface-2); border: 1px solid var(--border); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .sec-title { font-size: 14.5px; font-weight: 700; color: var(--text); }

      /* ── Candidate details ── */
      .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
      .kv {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 11px 0; border-bottom: 1px solid var(--border);
      }
      .kv:nth-last-child(-n+2) { border-bottom: none; padding-bottom: 0; }
      .kv-icon {
        width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; margin-top: 1px;
        background: var(--surface-2); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 13px;
      }
      .kv-label { display: block; font-size: 10.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .kv-val { display: block; font-size: 13px; color: var(--text); font-weight: 600; margin-top: 3px; word-break: break-word; }

      /* ── Experience ── */
      .exp-list { display: flex; flex-direction: column; }
      .exp-row { display: flex; gap: 12px; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
      .exp-row:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
      .exp-icon {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--blue-bg); color: var(--blue);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .exp-body { flex: 1; min-width: 0; }
      .exp-role { font-size: 13.5px; font-weight: 700; color: var(--text); }
      .exp-at { font-weight: 500; color: var(--text-muted); }
      .exp-dates { font-size: 11px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
      .exp-dates i { font-size: 12px; }
      .exp-notes { font-size: 12.5px; color: var(--text-muted); margin-top: 7px; white-space: pre-line; line-height: 1.6; }

      /* ── Qualifications ── */
      .qual-list { display: flex; flex-direction: column; }
      .qual-row { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); }
      .qual-row:last-child { border-bottom: none; padding-bottom: 0; }
      .qual-row:first-child { padding-top: 0; }
      .qual-icon {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--purple-bg); color: var(--purple);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .qual-name { font-size: 13px; font-weight: 700; color: var(--text); }
      .qual-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

      /* ── Skills ── */
      .skill-chips { display: flex; gap: 8px; flex-wrap: wrap; }
      .skill-chip {
        display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600;
        background: var(--surface-2); border: 1px solid var(--border); border-radius: 20px;
        padding: 7px 12px; color: var(--text);
      }
      .skill-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      .skill-dot.lvl-expert { background: var(--green); }
      .skill-dot.lvl-intermediate { background: var(--blue); }
      .skill-dot.lvl-beginner { background: var(--amber); }
      .skill-level { color: var(--text-muted); font-weight: 500; }
      .skill-level::before { content: '·'; margin-right: 7px; color: rgba(0,0,0,0.2); }

      /* ── Documents ── */
      .doc-list { display: flex; flex-direction: column; gap: 8px; }
      .doc-row {
        display: flex; align-items: center; gap: 12px; padding: 12px;
        border: 1px solid var(--border); border-radius: 10px; transition: all 0.15s;
      }
      .doc-row:hover { border-color: rgba(0,0,0,0.18); box-shadow: var(--shadow-sm); }
      .doc-icon {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--blue-bg); color: var(--blue);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .doc-meta { flex: 1; min-width: 0; }
      .doc-name { font-size: 13px; font-weight: 700; color: var(--text); }
      .doc-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .doc-view-btn { padding: 6px 12px; font-size: 12px; flex-shrink: 0; }

      /* ── Offer letter card ── */
      .offer-form { display: flex; flex-direction: column; gap: 4px; }
      .offer-form mat-form-field { width: 100%; }

      /* ── Move forward card ── */
      .move-select { width: 100%; }
      .move-btn {
        border-radius: 9px !important; width: 100%; height: 46px !important;
        display: inline-flex !important; align-items: center; justify-content: center; gap: 7px;
      }
      .move-btn-spinner { display: inline-block; }
      .move-btn-spinner ::ng-deep circle { stroke: #fff; }

      /* ── Pre-screening card (plain style, matches vacancy detail) ── */
      .ps-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .tmpl-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--border); }
      .tmpl-row .form-note { margin: 0; }
      .tmpl-upload-btn { padding: 5px 10px; font-size: 11.5px; flex-shrink: 0; margin-left: auto; cursor: pointer; }
      .vd-title-sm { font-size: 15px; font-weight: 700; color: var(--text); }
      .vd-ref { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
      .vd-section-label { font-size: 11px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }

      .assess-toggle { display: flex; gap: 10px; margin-top: 10px; }
      .assess-btn {
        flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        font-size: 13px; font-weight: 600; padding: 10px; border-radius: 9px; cursor: pointer;
        background: var(--surface-2); border: 1.5px solid var(--border); color: var(--text-muted);
        transition: all 0.15s; font-family: inherit;
      }
      .assess-btn:hover { border-color: rgba(0,0,0,0.25); }
      .assess-pass.active { background: var(--green-bg); border-color: #1a5c35; color: #1a5c35; }
      .assess-fail.active { background: var(--red-bg); border-color: var(--red); color: var(--red); }

      .assess-comment {
        width: 100%; margin-top: 12px; font-size: 13px; padding: 10px 12px; resize: vertical;
        border-radius: var(--radius); border: 1.5px solid rgba(0,0,0,0.15);
        background: #fff; color: var(--text); font-family: inherit;
      }
      .assess-comment:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgba(26,39,68,0.08); }

      .assess-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
      .assess-footer .btn-primary { padding: 9px 16px; }

      /* ── Preview modal ── */
      .ps-modal-backdrop {
        position: fixed; inset: 0; background: rgba(15,20,30,0.55); z-index: 1000;
        display: flex; align-items: center; justify-content: center; padding: 24px;
      }
      .ps-modal {
        background: #fff; border-radius: 14px; width: min(760px, 100%); max-height: 86vh;
        display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden;
      }
      .ps-modal-header {
        display: flex; align-items: center; justify-content: space-between; padding: 14px 18px;
        border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 700; color: var(--text);
      }
      .ps-modal-header i { color: var(--navy); margin-right: 6px; }
      .ps-modal-close { background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 6px; }
      .ps-modal-close:hover { background: var(--surface-2); color: var(--text); }
      .ps-modal-body { flex: 1; overflow: auto; background: var(--surface-2); min-height: 300px; }
      .ps-modal-iframe { width: 100%; height: 65vh; border: none; display: block; background: #fff; }
      .ps-modal-image { max-width: 100%; display: block; margin: 0 auto; }
      .ps-modal-text { padding: 18px; font-size: 12.5px; white-space: pre-wrap; color: var(--text); font-family: 'SFMono-Regular', Consolas, monospace; }
      .ps-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--border); background: #fff; }
    </style>
  `
})
export class ApplicationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appService = inject(ApplicationService);
  private candidateService = inject(CandidateService);
  private documentService = inject(DocumentService);
  private skillService = inject(CandidateSkillService);
  private experienceService = inject(CandidateExperienceService);
  private qualificationService = inject(CandidateQualificationService);
  private prescreening = inject(PrescreeningService);
  private vacancyService = inject(VacancyService);
  private offerLetter = inject(OfferLetterService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  auth = inject(AuthService);

  loading = signal(true);
  loadError = signal<string | null>(null);
  updating = signal(false);

  application = signal<ApplicationResponse | null>(null);
  candidate = signal<CandidateResponse | null>(null);
  skills = signal<CandidateSkillResponse[]>([]);
  experience = signal<ExperienceResponse[]>([]);
  qualifications = signal<QualificationResponse[]>([]);
  documents = signal<CandidateDocumentResponse[]>([]);
  vacancy = signal<VacancyResponse | null>(null);

  pendingStatus: ApplicationStatusKey | '' = '';

  previewOpen = signal(false);

  assessmentDraftResult = signal<PrescreeningOutcome | null>(null);
  assessmentDraftComment = signal('');
  savingAssessment = signal(false);

  psDoc = signal<PrescreeningResponse | null>(null);
  psLoading = signal(false);
  sendingPrescreening = signal(false);

  template = signal<PrescreeningTemplateResponse | null>(null);
  uploadingTemplate = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.loadError.set('Invalid application.'); this.loading.set(false); return; }
    this.load(id);
    this.prescreening.getTemplate().subscribe({ next: t => this.template.set(t), error: () => this.template.set(null) });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.psLoading.set(true);
    this.appService.getById(id).subscribe({
      next: app => {
        this.application.set(app);
        forkJoin({
          candidate: this.candidateService.getById(app.candidateId).pipe(catchError(() => of(null))),
          skills: this.skillService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          experience: this.experienceService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          qualifications: this.qualificationService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          documents: this.documentService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          vacancy: this.vacancyService.getById(app.vacancyId).pipe(catchError(() => of(null))),
          prescreening: this.prescreening.getByApplication(app.applicationId).pipe(catchError(() => of(null))),
          offer: this.offerLetter.getLatest(app.applicationId).pipe(catchError(() => of(null)))
        }).subscribe(res => {
          this.candidate.set(res.candidate);
          this.skills.set(res.skills);
          this.experience.set(res.experience);
          this.qualifications.set(res.qualifications);
          this.documents.set(res.documents);
          this.vacancy.set(res.vacancy);
          this.psDoc.set(res.prescreening);
          this.loading.set(false);
          this.psLoading.set(false);
          this.syncAssessmentDraft();
        });
      },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); this.psLoading.set(false); }
    });
  }

  doc(): PrescreeningResponse | null {
    return this.psDoc();
  }

  effectiveStatus(): string {
    const app = this.application();
    if (!app) return '';
    const base = this.prescreening.effectiveStatus(app.applicationId, app.status);
    // The offer overlay only applies while the real backend status is still
    // 'OfferExtended' - once the recruiter moves it on to Hired/NotSelected,
    // that real status should take over so the app doesn't get stuck showing
    // "Offer Accepted" forever.
    return base === 'OfferExtended' ? this.offerLetter.effectiveStatus(app.applicationId, base) : base;
  }

  nextOptions(): ApplicationStatusKey[] { return getValidNextStatuses(this.effectiveStatus()); }
  label(s: string): string { return (STATUS_LABELS as Record<string, string>)[s] ?? s; }
  statusClass(s: string): string { return STATUS_CLASS[s] ?? 'applied'; }
  docLabel(t: string): string { return (DOCUMENT_TYPE_LABELS as Record<string, string>)[t] ?? t; }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  skillClass(level: string): string {
    const l = (level || '').toLowerCase();
    if (l.includes('expert') || l.includes('advanced')) return 'lvl-expert';
    if (l.includes('intermediate')) return 'lvl-intermediate';
    return 'lvl-beginner';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  fileHref(fileUrl: string): string {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    const origin = environment.apiUrl.replace(/\/api\/?$/, '');
    return fileUrl.startsWith('/') ? origin + fileUrl : `${origin}/${fileUrl}`;
  }

  updateStatus(): void {
    const app = this.application();
    if (!app || !this.pendingStatus) return;
    const newStatus = this.pendingStatus;

    this.updating.set(true);
    this.appService.updateStatus(app.applicationId, { newStatus }).subscribe({
      next: updated => {
        this.application.set(updated);
        this.updating.set(false);
        this.pendingStatus = '';
        this.toast.show(`${app.candidateName} moved to ${this.label(newStatus)}.`, 'success');
      },
      error: (err: Error) => { this.updating.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  // ── Pre-screening template (Recruiter/Admin uploads the blank form once) ─
  onTemplateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const error = validatePrescreeningFile(file);
    if (error) { this.toast.show(error, 'error'); return; }

    this.uploadingTemplate.set(true);
    this.prescreening.uploadTemplate(file).subscribe({
      next: t => { this.template.set(t); this.uploadingTemplate.set(false); this.toast.show('Pre-screening template uploaded.', 'success'); },
      error: (err: Error) => { this.uploadingTemplate.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  // ── Send / review the pre-screening form ────────────────────────
  sendPrescreening(): void {
    const app = this.application();
    if (!app) return;

    this.sendingPrescreening.set(true);
    this.prescreening.send(app.applicationId).subscribe({
      next: doc => {
        this.psDoc.set(doc);
        // The backend transitions the application itself to 'PrescreeningStage'
        // as part of Send() - reflect that immediately without a full reload.
        this.application.set({ ...app, status: 'PrescreeningStage' });
        this.sendingPrescreening.set(false);
        this.toast.show(`Pre-screening form sent to ${app.candidateName}.`, 'success');
      },
      error: (err: Error) => { this.sendingPrescreening.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  // ── Preview modal ──────────────────────────────────────────────
  previewKind(): PreviewKind {
    const name = (this.doc()?.completedOriginalFileName || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    return 'unsupported';
  }

  previewUrl(): SafeResourceUrl {
    const d = this.doc();
    const url = d?.completedFileUrl ? this.fileHref(d.completedFileUrl) : '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openPreview(): void { this.previewOpen.set(true); }
  closePreview(): void { this.previewOpen.set(false); }

  // ── Assessment (Pass/Fail + comment) ───────────────────────────
  private syncAssessmentDraft(): void {
    this.assessmentDraftResult.set(null);
    this.assessmentDraftComment.set('');
  }

  setAssessmentResult(result: PrescreeningOutcome): void {
    if (result === 'Pending') return;
    this.assessmentDraftResult.set(result);
  }

  saveAssessment(): void {
    const app = this.application();
    const result = this.assessmentDraftResult();
    if (!app || !result || result === 'Pending') return;

    this.savingAssessment.set(true);
    this.prescreening.setOutcome(app.applicationId, result, this.assessmentDraftComment()).subscribe({
      next: doc => {
        this.psDoc.set(doc);
        // The backend auto-transitions the application to 'NotSelected' when
        // the outcome is Failed (see PrescreeningController.SetOutcome) -
        // reflect that immediately without a full reload. On Passed, the
        // status stays at 'PrescreeningStage' until the recruiter moves it
        // forward manually via "Move application forward".
        if (result === 'Failed') {
          this.application.set({ ...app, status: 'NotSelected' });
        }
        this.savingAssessment.set(false);
        this.toast.show(`Assessment saved: ${result}.`, 'success');
      },
      error: (err: Error) => { this.savingAssessment.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  // ── Offer letter ────────────────────────────────────────────────
  offer(): OfferLetterResponse | undefined {
    const app = this.application();
    return app ? this.offerLetter.peek(app.applicationId) : undefined;
  }
}
