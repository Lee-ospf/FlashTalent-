import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../core/services/application.service';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import {
  ApplicationResponse,
  ApplicationStatusHistoryResponse,
} from '../../core/models';
import {
  statusLabel as sharedStatusLabel,
  statusClass as sharedStatusClass,
} from '../../core/utils/application-status';
import { ToastService } from '../../core/services/toast.service';
import {
  PrescreeningService,
  PrescreeningResponse,
  PrescreeningTemplateResponse,
  validatePrescreeningFile,
} from '../../core/services/prescreening.service';
import {
  OfferLetterService,
  OfferLetterResponse,
} from '../../core/services/offer-letter.service';

const PIPELINE = [
  'Applied',
  'UnderReview',
  'Shortlisted',
  'PrescreeningStage',
  'InterviewStage',
  'OfferExtended',
  'Hired',
];

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">
            <i class="ti ti-file-check"></i> My Applications
          </h2>
          <p class="page-sub">
            {{ apps().length }} application{{ apps().length !== 1 ? 's' : '' }}
            · Track your recruitment progress
          </p>
        </div>
      </div>

      @if (!state.profile()) {
        <div class="info-banner warn">
          <i class="ti ti-alert-triangle"></i>
          Create your <a routerLink="/profile">candidate profile</a> first to
          start applying and tracking applications.
        </div>
      }

      @if (loadError()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> {{ loadError() }}
        </div>
      }

      <!-- Metrics -->
      <div
        class="metrics-grid"
        style="grid-template-columns:repeat(4,minmax(0,1fr))"
      >
        <div class="metric-card">
          <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1">
            <i class="ti ti-send"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ apps().length }}</div>
            <div class="metric-label">Total</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#ede7f6;color:#4527a0">
            <i class="ti ti-star"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ count('Shortlisted') }}</div>
            <div class="metric-label">Shortlisted</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#fff3e0;color:#e65100">
            <i class="ti ti-file-check"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ count('OfferExtended') }}</div>
            <div class="metric-label">Offers</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#e8f5e9;color:#1b5e20">
            <i class="ti ti-trophy"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ count('Hired') }}</div>
            <div class="metric-label">Hired</div>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="empty-state">
          <i class="ti ti-loader"></i>
          <p>Loading applications…</p>
        </div>
      } @else if (!apps().length && !loadError()) {
        <div class="empty-state">
          <i class="ti ti-clipboard-list"></i>
          <p>No applications yet.<br />Browse vacancies to apply.</p>
        </div>
      } @else if (apps().length) {
        <div class="app-list">
          @for (app of apps(); track app.applicationId) {
            <mat-card
              class="mat-elevation-z1 app-card"
              style="border-radius:12px;padding:0"
            >
              <!-- Header row -->
              <div
                class="app-card-header"
                (click)="toggle(app.applicationId)"
                role="button"
                [attr.aria-expanded]="isOpen(app.applicationId)"
              >
                <div
                  class="app-icon-wrap app-icon-{{ statusClass(app.status) }}"
                >
                  <i class="ti ti-briefcase"></i>
                </div>
                <div class="app-main">
                  <div class="app-title">{{ app.vacancyTitle }}</div>
                  <div class="app-sub">
                    Applied {{ formatDate(app.appliedAt) }}
                    @if (app.updatedAt) {
                      · Updated {{ formatDate(app.updatedAt) }}
                    }
                  </div>
                </div>
                <span class="status-pill s-{{ statusClass(app.status) }}">{{
                  statusLabel(app.status)
                }}</span>
                <i
                  class="ti ti-chevron-down expand-icon"
                  [class.open]="isOpen(app.applicationId)"
                ></i>
              </div>

              <!-- Expanded detail -->
              @if (isOpen(app.applicationId)) {
                <div class="app-detail">
                  <mat-divider></mat-divider>
                  <div style="padding:18px 20px">
                    <!-- Pipeline -->
                    <div class="detail-label">Recruitment pipeline</div>
                    <div class="pipeline-track" style="margin-bottom:20px">
                      @for (
                        step of pipelineSteps(app);
                        track step.label;
                        let last = $last
                      ) {
                        <div
                          class="pip-step"
                          [class.done]="step.state === 'done'"
                          [class.pip-last]="last"
                        >
                          <div
                            class="pip-dot"
                            [class.dot-done]="step.state === 'done'"
                            [class.dot-active]="step.state === 'active'"
                            [class.dot-rejected]="step.state === 'rejected'"
                          >
                            <i
                              class="ti"
                              [class.ti-check]="step.state === 'done'"
                              [class.ti-x]="step.state === 'rejected'"
                              [class.ti-player-play]="step.state === 'active'"
                              [class.ti-circle]="step.state === 'pending'"
                            ></i>
                          </div>
                          <div
                            class="pip-label"
                            [class.label-done]="step.state === 'done'"
                            [class.label-active]="step.state === 'active'"
                            [class.label-rejected]="step.state === 'rejected'"
                          >
                            {{ step.label }}
                          </div>
                        </div>
                      }
                    </div>

                    <!-- Pre-Screening Assessment -->
                    @if (prescreeningDoc(app.applicationId); as doc) {
                      <div style="margin-bottom:20px">
                        <div class="ps-section-label">
                          Pre-screening assessment
                        </div>

                        @if (doc.status === 'Sent') {
                          <p class="ps-intro">
                            A pre-screening document has been sent for this
                            application. Download it, fill it in, then upload
                            the completed file below.
                          </p>
                          <div class="ps-actions">
                            @if (template(); as t) {
                              <a
                                class="btn-secondary"
                                [href]="fileHref(t.fileUrl)"
                                target="_blank"
                                rel="noopener"
                              >
                                <i class="ti ti-eye"></i> View document
                              </a>
                              <a
                                class="btn-secondary"
                                [href]="fileHref(t.fileUrl)"
                                [download]="t.originalFileName"
                              >
                                <i class="ti ti-download"></i> Download document
                              </a>
                            }
                          </div>

                          <div class="ps-upload-box">
                            <input
                              type="file"
                              class="ps-file-input"
                              accept=".pdf,.doc,.docx"
                              [id]="'ps-file-' + app.applicationId"
                              (change)="
                                onFileSelected($event, app.applicationId)
                              "
                            />
                            <label
                              class="btn-secondary"
                              [for]="'ps-file-' + app.applicationId"
                            >
                              <i class="ti ti-paperclip"></i>
                              {{
                                selectedFileName(app.applicationId) ||
                                  'Choose completed document'
                              }}
                            </label>
                            @if (uploadError(app.applicationId)) {
                              <div class="api-error" style="margin-top:8px">
                                <i class="ti ti-alert-circle"></i>
                                {{ uploadError(app.applicationId) }}
                              </div>
                            }
                            <div class="ps-actions" style="margin-top:10px">
                              <button
                                class="btn-primary"
                                [disabled]="
                                  !selectedFileName(app.applicationId) ||
                                  submittingId() === app.applicationId
                                "
                                (click)="submitUpload(app)"
                              >
                                @if (submittingId() === app.applicationId) {
                                  <mat-spinner
                                    diameter="16"
                                    style="display:inline-block;margin-right:6px"
                                  ></mat-spinner>
                                }
                                Upload completed document
                              </button>
                            </div>
                          </div>
                        } @else {
                          <div class="ps-doc-row">
                            <span class="ps-doc-icon"
                              ><i class="ti ti-circle-check"></i
                            ></span>
                            <div class="ps-doc-meta">
                              <div class="ps-doc-name">
                                {{
                                  doc.completedOriginalFileName ||
                                    'Assessment submitted'
                                }}
                              </div>
                              <div class="ps-doc-sub">
                                Submitted {{ formatDate(doc.submittedAt!) }} ·
                                the recruiter can now view it
                              </div>
                            </div>
                            <div style="display:flex;gap:8px;flex-shrink:0">
                              <a
                                class="btn-secondary doc-view-btn"
                                [href]="fileHref(doc.completedFileUrl!)"
                                target="_blank"
                                rel="noopener"
                              >
                                <i class="ti ti-eye"></i> View
                              </a>
                              <a
                                class="btn-secondary doc-view-btn"
                                [href]="fileHref(doc.completedFileUrl!)"
                                [download]="doc.completedOriginalFileName"
                              >
                                <i class="ti ti-download"></i> Download
                              </a>
                            </div>
                          </div>
                          @if (doc.status === 'Reviewed') {
                            <p class="form-note" style="margin-top:10px">
                              <i
                                class="ti"
                                [class.ti-circle-check]="
                                  doc.outcome === 'Passed'
                                "
                                [class.ti-circle-x]="doc.outcome === 'Failed'"
                              ></i>
                              Reviewed as <strong>{{ doc.outcome }}</strong>
                            </p>
                          }
                        }
                      </div>
                    }

                    <!-- Offer Letter -->
                    @if (offerDoc(app.applicationId); as offerLetter) {
                      <div style="margin-bottom:20px">
                        <div class="ps-section-label">Offer letter</div>

                        <div class="offer-kv-grid">
                          <div class="offer-kv">
                            <span class="offer-kv-label">Position</span
                            ><span class="offer-kv-val">{{
                              offerLetter.jobTitle
                            }}</span>
                          </div>
                          <div class="offer-kv">
                            <span class="offer-kv-label">Employment type</span
                            ><span class="offer-kv-val">{{
                              offerLetter.employmentType || '—'
                            }}</span>
                          </div>
                          <div class="offer-kv">
                            <span class="offer-kv-label">Location</span
                            ><span class="offer-kv-val">{{
                              offerLetter.location || '—'
                            }}</span>
                          </div>
                          <div class="offer-kv">
                            <span class="offer-kv-label">Salary</span
                            ><span class="offer-kv-val"
                              >ZAR
                              {{
                                offerLetter.salary.toLocaleString('en-ZA')
                              }}</span
                            >
                          </div>
                          <div class="offer-kv">
                            <span class="offer-kv-label"
                              >Proposed start date</span
                            ><span class="offer-kv-val">{{
                              formatDate(offerLetter.startDate)
                            }}</span>
                          </div>
                          <div class="offer-kv">
                            <span class="offer-kv-label">Closing date</span
                            ><span class="offer-kv-val">{{
                              formatDate(offerLetter.closingDate)
                            }}</span>
                          </div>
                        </div>

                        <div class="ps-actions" style="margin-top:12px">
                          <button
                            class="btn-secondary"
                            (click)="viewOffer(offerLetter)"
                          >
                            <i class="ti ti-eye"></i> View offer letter
                          </button>
                          <button
                            class="btn-secondary"
                            (click)="downloadOffer(offerLetter)"
                          >
                            <i class="ti ti-download"></i> Download offer letter
                          </button>
                        </div>

                        @if (offerLetter.status === 'Sent') {
                          <div class="offer-response-box">
                            <p class="ps-intro" style="margin-bottom:12px">
                              Review the terms above, then accept or decline
                              this offer.
                            </p>

                            @if (!isDeclining(app.applicationId)) {
                              <div class="ps-actions">
                                <button
                                  class="btn-primary"
                                  [disabled]="
                                    respondingId() === app.applicationId
                                  "
                                  (click)="acceptOffer(app)"
                                >
                                  @if (respondingId() === app.applicationId) {
                                    <mat-spinner
                                      diameter="14"
                                      style="display:inline-block;margin-right:6px"
                                    ></mat-spinner>
                                  }
                                  <i class="ti ti-circle-check"></i> Accept
                                  offer
                                </button>
                                <button
                                  class="btn-secondary"
                                  [disabled]="
                                    respondingId() === app.applicationId
                                  "
                                  (click)="startDecline(app.applicationId)"
                                >
                                  <i class="ti ti-circle-x"></i> Decline offer
                                </button>
                              </div>
                            } @else {
                              <textarea
                                class="assess-comment-plain"
                                rows="2"
                                placeholder="Reason for declining (optional, for your own reference)…"
                                [ngModel]="
                                  declineReasonDraft(app.applicationId)
                                "
                                (ngModelChange)="
                                  setDeclineReason(app.applicationId, $event)
                                "
                              ></textarea>
                              <div class="ps-actions" style="margin-top:10px">
                                <button
                                  class="btn-primary"
                                  [disabled]="
                                    respondingId() === app.applicationId
                                  "
                                  (click)="confirmDecline(app)"
                                >
                                  @if (respondingId() === app.applicationId) {
                                    <mat-spinner
                                      diameter="14"
                                      style="display:inline-block;margin-right:6px"
                                    ></mat-spinner>
                                  }
                                  Confirm decline
                                </button>
                                <button
                                  class="btn-secondary"
                                  (click)="cancelDecline(app.applicationId)"
                                >
                                  Cancel
                                </button>
                              </div>
                            }
                          </div>
                        } @else if (offerLetter.status === 'Accepted') {
                          <p
                            class="form-note"
                            style="color:#1a5c35;margin-top:10px"
                          >
                            <i class="ti ti-circle-check"></i> You accepted this
                            offer on {{ formatDate(offerLetter.respondedAt!) }}.
                          </p>
                        } @else {
                          <p
                            class="form-note"
                            style="color:var(--red);margin-top:10px"
                          >
                            <i class="ti ti-circle-x"></i> You declined this
                            offer on {{ formatDate(offerLetter.respondedAt!) }}.
                          </p>
                        }
                      </div>
                    }

                    <!-- History -->
                    <div class="detail-label">Status history</div>
                    @if (historyLoading().has(app.applicationId)) {
                      <div
                        style="font-size:12px;color:var(--text-muted);padding:8px 0;display:flex;align-items:center;gap:8px"
                      >
                        <mat-spinner diameter="16"></mat-spinner> Loading
                        history…
                      </div>
                    } @else if (!getHistory(app.applicationId).length) {
                      <div style="font-size:12px;color:var(--text-muted)">
                        No status history yet.
                      </div>
                    } @else {
                      <div class="timeline">
                        @for (
                          event of getHistory(app.applicationId);
                          track event.applicationStatusHistoryId;
                          let last = $last
                        ) {
                          <div class="tl-entry">
                            <div class="tl-line">
                              <div
                                class="tl-dot"
                                [style.background]="dotColor(event.newStatus)"
                              ></div>
                              @if (!last) {
                                <div class="tl-connector"></div>
                              }
                            </div>
                            <div class="tl-content">
                              <span
                                class="status-pill s-{{
                                  statusClass(event.newStatus)
                                }}"
                              >
                                {{ statusLabel(event.newStatus) }}
                              </span>
                              <div class="tl-meta">
                                <i class="ti ti-user"></i>
                                {{ event.changedByName }}
                                &nbsp;·&nbsp;
                                <i class="ti ti-clock"></i>
                                {{ formatDate(event.changedAt) }}
                              </div>
                              @if (event.oldStatus !== event.newStatus) {
                                <div class="tl-note">
                                  Moved from {{ statusLabel(event.oldStatus) }}
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }

                    <!-- IDs -->
                    <div class="app-ids">
                      <span class="id-chip"
                        ><i class="ti ti-hash"></i> APP-{{
                          app.applicationId
                        }}</span
                      >
                      <span class="id-chip"
                        ><i class="ti ti-user"></i> Candidate #{{
                          app.candidateId
                        }}</span
                      >
                      <span class="id-chip"
                        ><i class="ti ti-building"></i> Vacancy #{{
                          app.vacancyId
                        }}</span
                      >
                    </div>
                  </div>
                </div>
              }
            </mat-card>
          }
        </div>
      }
    </div>

    @if (previewingOffer(); as o) {
      <div class="ps-modal-backdrop" (click)="closeOfferPreview()">
        <div class="ps-modal" (click)="$event.stopPropagation()">
          <div class="ps-modal-header">
            <div>
              <i class="ti ti-file-certificate"></i> Offer letter —
              {{ o.jobTitle }}
            </div>
            <button class="ps-modal-close" (click)="closeOfferPreview()">
              <i class="ti ti-x"></i>
            </button>
          </div>
          <div class="ps-modal-body">
            <iframe class="ps-modal-frame" [srcdoc]="o.generatedHtml"></iframe>
          </div>
          <div class="ps-modal-footer">
            <button class="btn-secondary" (click)="closeOfferPreview()">
              Close
            </button>
            <button class="btn-primary" (click)="downloadOffer(o)">
              <i class="ti ti-download"></i> Download
            </button>
          </div>
        </div>
      </div>
    }

    <style>
      .ps-section-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--navy);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 10px;
      }
      .ps-intro {
        font-size: 13px;
        color: var(--text);
        line-height: 1.6;
        margin-bottom: 12px;
      }
      .ps-actions {
        display: flex;
        gap: 8px;
        margin-top: 0;
        flex-wrap: wrap;
        align-items: center;
      }

      .ps-upload-box {
        margin-top: 14px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: #fff;
      }
      .ps-file-input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        opacity: 0;
      }

      .ps-doc-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 10px;
      }
      .ps-doc-icon {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        flex-shrink: 0;
        background: var(--green-bg);
        color: #1a5c35;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
      }
      .ps-doc-meta {
        flex: 1;
        min-width: 0;
      }
      .ps-doc-name {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        word-break: break-word;
      }
      .ps-doc-sub {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .doc-view-btn {
        padding: 6px 12px;
        font-size: 12px;
        flex-shrink: 0;
      }

      .offer-kv-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 20px;
      }
      .offer-kv {
        display: flex;
        flex-direction: column;
        padding: 9px 0;
        border-bottom: 1px solid var(--border);
      }
      .offer-kv:nth-last-child(-n + 2) {
        border-bottom: none;
        padding-bottom: 0;
      }
      .offer-kv-label {
        font-size: 10.5px;
        color: var(--text-muted);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .offer-kv-val {
        font-size: 13px;
        color: var(--text);
        font-weight: 600;
        margin-top: 3px;
      }
      .offer-terms {
        font-size: 12.5px;
        color: var(--text-muted);
        line-height: 1.6;
        margin-top: 12px;
        white-space: pre-line;
      }
      .offer-response-box {
        margin-top: 16px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: #fff;
      }
      .assess-comment-plain {
        width: 100%;
        font-size: 13px;
        padding: 10px 12px;
        resize: vertical;
        border-radius: var(--radius);
        border: 1.5px solid rgba(0, 0, 0, 0.15);
        background: #fff;
        color: var(--text);
        font-family: inherit;
      }
      .assess-comment-plain:focus {
        outline: none;
        border-color: var(--navy);
        box-shadow: 0 0 0 3px rgba(26, 39, 68, 0.08);
      }

      /* ── Offer letter preview modal ── */
      .ps-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .ps-modal {
        background: #fff;
        border-radius: 14px;
        width: min(680px, 100%);
        max-height: 86vh;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-lg);
        overflow: hidden;
      }
      .ps-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--border);
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .ps-modal-header i {
        color: var(--navy);
        margin-right: 6px;
      }
      .ps-modal-close {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        padding: 4px;
        border-radius: 6px;
      }
      .ps-modal-close:hover {
        background: var(--surface-2);
        color: var(--text);
      }
      .ps-modal-body {
        flex: 1;
        overflow: auto;
        background: var(--surface-2);
        min-height: 300px;
      }
      .ps-modal-frame {
        width: 100%;
        height: 60vh;
        border: none;
        background: #fff;
      }
      .ps-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 18px;
        border-top: 1px solid var(--border);
        background: #fff;
      }
    </style>
  `,
})
export class ApplicationsComponent implements OnInit {
  private appService = inject(ApplicationService);
  private toast = inject(ToastService);
  private prescreening = inject(PrescreeningService);
  private offerLetter = inject(OfferLetterService);
  state = inject(CandidateStateService);

  apps = signal<ApplicationResponse[]>([]);
  loading = signal(false);
  loadError = signal('');

  private expanded = signal<Set<number>>(new Set());
  historyLoading = signal<Set<number>>(new Set());
  private historyCache = new Map<number, ApplicationStatusHistoryResponse[]>();

  submittingId = signal<number | null>(null);

  // Pending file selection per application, awaiting upload confirmation.
  private selectedFiles: Record<number, File> = {};
  private uploadErrors: Record<number, string> = {};

  template = signal<PrescreeningTemplateResponse | null>(null);

  // ── Offer letter response state ────────────────────────────────
  respondingId = signal<number | null>(null);
  private decliningIds = signal<Set<number>>(new Set());
  private declineReasons: Record<number, string> = {};

  ngOnInit(): void {
    const p = this.state.profile();
    if (!p) return; // banner in the template covers this case, nothing to load yet

    this.loading.set(true);
    this.appService.getByCandidate(p.candidateId).subscribe({
      next: (a) => {
        this.apps.set(a);
        this.loading.set(false);
        // Pre-screening records / offer letters can exist for any application -
        // load them all so prescreeningDoc()/offerDoc()/effectiveStatus() can
        // read them synchronously in the template.
        this.prescreening
          .preload(a.map((app) => app.applicationId))
          .subscribe();
        this.offerLetter.preload(a.map((app) => app.applicationId)).subscribe();
      },
      error: (err: Error) => {
        this.loadError.set(err.message);
        this.loading.set(false);
      },
    });
    this.prescreening.getTemplate().subscribe({
      next: (t) => this.template.set(t),
      error: () => this.template.set(null),
    });
  }

  toggle(id: number): void {
    const s = new Set(this.expanded());
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
      if (!this.historyCache.has(id)) this.loadHistory(id);
    }
    this.expanded.set(s);
  }

  isOpen(id: number): boolean {
    return this.expanded().has(id);
  }

  private loadHistory(id: number): void {
    this.historyLoading.update((s) => new Set([...s, id]));
    this.appService.getHistory(id).subscribe({
      next: (h) => {
        this.historyCache.set(id, h);
        this.historyLoading.update((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      },
      error: () =>
        this.historyLoading.update((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }),
    });
  }

  getHistory(id: number): ApplicationStatusHistoryResponse[] {
    return this.historyCache.get(id) ?? [];
  }

  count(status: string): number {
    return this.apps().filter((a) => a.status === status).length;
  }

  statusClass(s: string): string {
    return sharedStatusClass(s);
  }
  statusLabel(s: string): string {
    return sharedStatusLabel(s);
  }

  dotColor(s: string): string {
    const m: Record<string, string> = {
      Hired: '#1b5e20',
      OfferExtended: '#2D7A4F',
      NotSelected: '#c62828',
    };
    return m[s] ?? '#1A2744';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  effectiveStatus(app: ApplicationResponse): string {
    const base = this.prescreening.effectiveStatus(
      app.applicationId,
      app.status,
    );
    // Same rule as the recruiter side: the offer overlay only applies while the
    // real backend status is still 'OfferExtended', so it doesn't get stuck
    // showing "Offer Accepted" after the recruiter later moves to Hired.
    return base === 'OfferExtended'
      ? this.offerLetter.effectiveStatus(app.applicationId, base)
      : base;
  }

  pipelineSteps(app: ApplicationResponse) {
    const status = this.effectiveStatus(app);
    // Offer-letter overlay statuses aren't steps of their own - they sit at the
    // 'OfferExtended' point in the pipeline (or terminate it, for a decline).
    const isNotSelected =
      status === 'NotSelected' || status === 'OfferDeclined';
    const progressStatus =
      status === 'OfferSent' || status === 'OfferAccepted'
        ? 'OfferExtended'
        : status;
    const steps = isNotSelected ? [...PIPELINE, 'NotSelected'] : PIPELINE;
    const ci = isNotSelected ? steps.length - 1 : steps.indexOf(progressStatus);
    return steps.map((label, i) => {
      if (isNotSelected && label === 'NotSelected')
        return { label: 'Not Selected', state: 'rejected' as const };
      if (i < ci)
        return { label: sharedStatusLabel(label), state: 'done' as const };
      if (i === ci)
        return {
          label: sharedStatusLabel(label),
          state: 'active' as const,
        };
      return { label: sharedStatusLabel(label), state: 'pending' as const };
    });
  }

  // ── Pre-screening assessment ──────────────────────────────────────
  prescreeningDoc(applicationId: number): PrescreeningResponse | undefined {
    return this.prescreening.peek(applicationId);
  }

  fileHref(relativeUrl: string): string {
    return this.prescreening.fileHref(relativeUrl);
  }

  selectedFileName(applicationId: number): string {
    return this.selectedFiles[applicationId]?.name ?? '';
  }

  uploadError(applicationId: number): string {
    return this.uploadErrors[applicationId] ?? '';
  }

  onFileSelected(event: Event, applicationId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const error = validatePrescreeningFile(file);
    if (error) {
      this.uploadErrors[applicationId] = error;
      delete this.selectedFiles[applicationId];
      return;
    }

    this.selectedFiles[applicationId] = file;
    delete this.uploadErrors[applicationId];
  }

  submitUpload(app: ApplicationResponse): void {
    const file = this.selectedFiles[app.applicationId];
    if (!file) {
      this.uploadErrors[app.applicationId] =
        'Please choose a completed document first.';
      return;
    }

    this.submittingId.set(app.applicationId);
    this.prescreening.submit(app.applicationId, file).subscribe({
      next: (doc) => {
        delete this.selectedFiles[app.applicationId];
        this.submittingId.set(null);
        this.toast.show(
          'Pre-screening document uploaded. The recruiter can now view it.',
          'success',
        );
      },
      error: (err: Error) => {
        this.submittingId.set(null);
        this.uploadErrors[app.applicationId] = err.message;
      },
    });
  }

  // ── Offer letter ────────────────────────────────────────────────
  offerDoc(applicationId: number): OfferLetterResponse | undefined {
    return this.offerLetter.peek(applicationId);
  }

  downloadOffer(offer: OfferLetterResponse): void {
    this.offerLetter.downloadLetter(offer);
  }

  previewingOffer = signal<OfferLetterResponse | null>(null);
  viewOffer(offer: OfferLetterResponse): void {
    this.previewingOffer.set(offer);
  }
  closeOfferPreview(): void {
    this.previewingOffer.set(null);
  }

  isDeclining(applicationId: number): boolean {
    return this.decliningIds().has(applicationId);
  }

  startDecline(applicationId: number): void {
    this.decliningIds.update((s) => new Set([...s, applicationId]));
  }

  cancelDecline(applicationId: number): void {
    this.decliningIds.update((s) => {
      const n = new Set(s);
      n.delete(applicationId);
      return n;
    });
    delete this.declineReasons[applicationId];
  }

  declineReasonDraft(applicationId: number): string {
    return this.declineReasons[applicationId] ?? '';
  }
  setDeclineReason(applicationId: number, value: string): void {
    this.declineReasons[applicationId] = value;
  }

  acceptOffer(app: ApplicationResponse): void {
    const offer = this.offerLetter.peek(app.applicationId);
    if (!offer) return;
    this.respondingId.set(app.applicationId);
    this.offerLetter.respond(offer.offerLetterId, 'Accepted').subscribe({
      next: () => {
        this.respondingId.set(null);
        this.toast.show(
          'Offer accepted! The recruiter has been notified.',
          'success',
        );
      },
      error: (err: Error) => {
        this.respondingId.set(null);
        this.toast.show(err.message, 'error');
      },
    });
  }

  confirmDecline(app: ApplicationResponse): void {
    const offer = this.offerLetter.peek(app.applicationId);
    if (!offer) return;
    this.respondingId.set(app.applicationId);
    // Note: the backend doesn't currently accept a decline reason on this
    // endpoint - it's kept client-side only, for the candidate's own reference.
    this.offerLetter.respond(offer.offerLetterId, 'Declined').subscribe({
      next: () => {
        this.respondingId.set(null);
        this.cancelDecline(app.applicationId);
        this.toast.show('Offer declined.', 'success');
      },
      error: (err: Error) => {
        this.respondingId.set(null);
        this.toast.show(err.message, 'error');
      },
    });
  }
}
