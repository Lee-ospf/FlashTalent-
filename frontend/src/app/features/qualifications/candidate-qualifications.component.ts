import { Component, inject, OnInit, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { CandidateQualificationService } from '../../core/services/candidate-qualification.service';
import { DocumentService, DocumentTypeKey, validateFileClient } from '../../core/services/document.service';
import { ToastService } from '../../core/services/toast.service';
import { ResumeAutofillStoreService, QualificationItem } from '../../core/services/resume-autofill-store.service';
import { QualificationResponse, CandidateDocumentResponse } from '../../core/models';
import { environment } from '../../../environments/environment';
import { DatePickerTriggerDirective } from '../../shared/directives/date-picker-trigger.directive';

@Component({
  selector: 'app-candidate-qualifications',
  standalone: true,
  imports: [CommonModule,DatePickerTriggerDirective , ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div [class.page-container]="!embedded" [class.step-body-padded]="embedded">
      @if (!embedded) {
        <div class="page-header">
          <div>
            <h2 class="page-title"><i class="ti ti-school"></i> Qualifications</h2>
            <p class="page-sub">Education and certifications, visible to recruiters</p>
          </div>
        </div>
      }

      @if (autofillStore.qualifications().length) {
        <div class="autofill-review-block">
          <div class="autofill-review-header">
            <i class="ti ti-sparkles"></i> Found {{ autofillStore.qualifications().length }} qualification(s) in your CV — review and add
          </div>
          @for (item of autofillStore.qualifications(); track item.id) {
            <div class="autofill-card autofill-card-stack">
              <div class="autofill-card-body">
                <div class="autofill-card-title">{{ item.name }}</div>
                <div class="autofill-card-sub">{{ item.qualificationType }} · {{ item.institution }}</div>
                @if (item.yearCompleted) {
                  <div class="autofill-card-desc">Completed {{ formatYear(item.yearCompleted) }}</div>
                } @else {
                  <input type="date" class="ai-mini-date" [max]="maxDate"
                         [value]="qualYearDraft[item.id] ?? ''"
                         (change)="qualYearDraft[item.id] = $any($event.target).value">
                  <span class="autofill-missing-note">AI couldn't find a date — set one to add this.</span>
                }
              </div>
              <div class="autofill-card-actions">
                <button mat-stroked-button style="border-radius:8px" (click)="addSuggestedQualification(item)"
                        [disabled]="saving() || (!item.yearCompleted && !qualYearDraft[item.id])">
                  <i class="ti ti-plus"></i> Add
                </button>
                <button type="button" class="chip-dismiss" (click)="autofillStore.removeQualification(item.id)"><i class="ti ti-x"></i></button>
              </div>
            </div>
          }
        </div>
      }

      <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label"><i class="ti ti-plus"></i> Add a qualification</div>
          <form [formGroup]="form" (ngSubmit)="add()">
            <div class="field-grid">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Type</mat-label>
                <mat-select formControlName="qualificationType">
                  <mat-option value="Education">Education</mat-option>
                  <mat-option value="Certification">Certification</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g. BSc Computer Science">
                @if (invalid('name')) { <mat-error>Required</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Institution</mat-label>
                <input matInput formControlName="institution" placeholder="e.g. University of Pretoria">
                @if (invalid('institution')) { <mat-error>Required</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Year completed</mat-label>
                <input matInput type="date" formControlName="yearCompleted" [max]="maxDate">
                @if (invalid('yearCompleted')) { <mat-error>Required</mat-error> }
              </mat-form-field>
            </div>

            <div class="attach-row">
              <button type="button" mat-stroked-button style="border-radius:8px" (click)="fileInput.click()">
                <i class="ti ti-paperclip"></i>&nbsp;{{ selectedFile() ? 'Change file' : 'Attach certificate / transcript (optional)' }}
              </button>
              @if (selectedFile()) {
                <span class="attach-filename">
                  <i class="ti ti-file-check" style="color:#2D7A4F"></i> {{ selectedFile()!.name }}
                  <button type="button" class="attach-remove" (click)="clearSelectedFile()"><i class="ti ti-x"></i></button>
                </span>
              }
              <input #fileInput type="file" accept=".pdf,.doc,.docx" style="display:none" (change)="onFileSelected($event)">
            </div>
            <p class="form-note" style="margin-top:4px">
              <i class="ti ti-info-circle"></i> PDF, DOC, DOCX · max 5 MB. You can add this later if you don't have it on hand.
            </p>

            <button mat-raised-button color="primary" type="submit" style="border-radius:8px;margin-top:12px" [disabled]="form.invalid || saving()">
              @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
              <i class="ti ti-plus"></i> Add
            </button>
          </form>
          @if (apiError) {
            <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
          }
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!qualifications().length) {
        <div class="empty-state"><i class="ti ti-school-off"></i><p>No qualifications added yet.</p></div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (q of qualifications(); track q.candidateQualificationId) {
            <div class="doc-slot">
              <div class="doc-info">
                <div class="doc-name">{{ q.name }}</div>
                <div class="doc-meta">{{ q.qualificationType }} · {{ q.institution }} · {{ formatYear(q.yearCompleted) }}</div>
                @if (attachmentFor(q.candidateQualificationId); as att) {
                  <a [href]="fileUrl(att.fileUrl)" target="_blank" class="attach-link">
                    <i class="ti ti-paperclip"></i> {{ att.originalFileName }}
                  </a>
                } @else {
                  <span class="attach-missing"><i class="ti ti-paperclip-off"></i> No certificate attached</span>
                }
              </div>
              <div class="doc-actions">
                <button class="btn-remove" (click)="remove(q)"><i class="ti ti-trash"></i></button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <style>
      .step-body-padded { padding: 1.5rem; }
      .attach-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
      .attach-filename {
        display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #1a5c35;
        background: var(--green-bg); border: 1px solid var(--green-mid); border-radius: 20px; padding: 5px 10px;
      }
      .attach-remove { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; padding: 0; margin-left: 2px; }
      .attach-remove:hover { opacity: 1; }
      .attach-link {
        display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #1565c0;
        margin-top: 4px; text-decoration: none; font-weight: 500;
      }
      .attach-link:hover { text-decoration: underline; }
      .attach-missing { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted); margin-top: 4px; }

      .autofill-review-block { margin-bottom: 20px; }
      .autofill-review-header { font-size: 12px; font-weight: 600; color: #6a1b9a; display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
      .autofill-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid #ce93d8; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; }
      .autofill-card-stack { align-items: flex-start; }
      .autofill-card-body { flex: 1; min-width: 0; }
      .autofill-card-title { font-size: 13px; font-weight: 600; color: var(--text); }
      .autofill-card-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      .autofill-card-desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
      .autofill-missing-note { display: block; font-size: 11px; color: #c0392b; margin-top: 4px; }
      .autofill-card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
      .ai-mini-date { border: 1px solid #ddd; border-radius: 8px; padding: 6px 8px; font-size: 12px; margin-top: 6px; }
      .chip-dismiss { background: none; border: none; cursor: pointer; opacity: 0.5; padding: 4px; }
      .chip-dismiss:hover { opacity: 1; }
    </style>
  `,
})
export class CandidateQualificationsComponent implements OnInit {
  @Input() embedded = false;
  @Output() saved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private state = inject(CandidateStateService);
  private qualService = inject(CandidateQualificationService);
  private docService = inject(DocumentService);
  private toast = inject(ToastService);
  autofillStore = inject(ResumeAutofillStoreService);

  qualifications = signal<QualificationResponse[]>([]);
  attachments = signal<CandidateDocumentResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';
  maxDate = new Date().toISOString().substring(0, 10);
  selectedFile = signal<File | null>(null);

  // Draft dates for CV-suggested qualifications missing a year — keyed by
  // the suggestion's autofill id, plain object since it's only read/written
  // from template event bindings.
  qualYearDraft: Record<string, string> = {};

  form = this.fb.group({
    qualificationType: ['Education', Validators.required],
    name: ['', Validators.required],
    institution: ['', Validators.required],
    yearCompleted: ['', Validators.required],
  });

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  formatYear(d: string): string {
    return new Date(d).getFullYear().toString();
  }

  fileUrl(relative: string): string {
    const origin = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${origin}${relative}`;
  }

  attachmentFor(qualificationId: number): CandidateDocumentResponse | undefined {
    return this.attachments().find(a => a.qualificationId === qualificationId);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    const p = this.state.profile();
    if (!p) return;
    this.loading.set(true);
    this.qualService.getAll(p.candidateId).subscribe({
      next: q => {
        this.qualifications.set(q);
        this.loadAttachments(p.candidateId);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadAttachments(candidateId: number): void {
    this.docService.getAll(candidateId).subscribe({
      next: docs => {
        this.attachments.set(docs.filter(d => d.qualificationId != null));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const err = validateFileClient(file);
    if (err) { this.toast.show(err, 'error'); (e.target as HTMLInputElement).value = ''; return; }
    this.selectedFile.set(file);
    (e.target as HTMLInputElement).value = '';
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
  }

  add(): void {
    const p = this.state.profile();
    if (!p || this.form.invalid) return;
    this.apiError = '';
    this.saving.set(true);
    const wasEmpty = this.qualifications().length === 0;
    const v = this.form.value;

    this.qualService.create(p.candidateId, {
      qualificationType: v.qualificationType as any,
      name: v.name!,
      institution: v.institution!,
      yearCompleted: new Date(v.yearCompleted!).toISOString(),
    }).subscribe({
      next: created => {
        this.qualifications.update(list => [created, ...list]);

        const file = this.selectedFile();
        if (!file) {
          this.finishAdd('Qualification added.', wasEmpty);
          return;
        }

        const docType: DocumentTypeKey = created.qualificationType === 'Certification' ? 'Certification' : 'Qualification';

        this.docService.upload(p.candidateId, docType, file, created.candidateQualificationId).subscribe({
          next: uploaded => {
            this.attachments.update(list => [...list, uploaded]);
            this.finishAdd('Qualification added with certificate attached.', wasEmpty);
          },
          error: (err: Error) => {
            this.finishAdd(`Qualification added, but the file failed to attach: ${err.message}`, wasEmpty);
          },
        });
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; },
    });
  }

  private finishAdd(message: string, wasEmpty: boolean): void {
    this.saving.set(false);
    this.selectedFile.set(null);
    this.form.reset({ qualificationType: 'Education', name: '', institution: '', yearCompleted: '' });
    this.toast.show(message, 'success');
    if (wasEmpty) this.saved.emit();
  }

  remove(q: QualificationResponse): void {
    const p = this.state.profile();
    if (!p) return;
    if (!confirm(`Remove "${q.name}"? Any attached certificate will be removed too.`)) return;
    this.qualService.delete(p.candidateId, q.candidateQualificationId).subscribe({
      next: () => {
        this.qualifications.update(list => list.filter(x => x.candidateQualificationId !== q.candidateQualificationId));
        this.attachments.update(list => list.filter(a => a.qualificationId !== q.candidateQualificationId));
        this.toast.show('Qualification removed.', 'success');
      },
      error: (err: Error) => this.toast.show(err.message, 'error'),
    });
  }

  // Saves a CV-suggested qualification via the real create endpoint — same
  // path as the manual form. Falls back to the candidate's drafted date if
  // the AI didn't find one on the CV; the Add button stays disabled until
  // some date is set.
  addSuggestedQualification(item: QualificationItem): void {
    const p = this.state.profile();
    const year = item.yearCompleted ?? this.qualYearDraft[item.id];
    if (!p || !year) return;

    this.saving.set(true);
    this.qualService.create(p.candidateId, {
      qualificationType: item.qualificationType as any,
      name: item.name,
      institution: item.institution,
      yearCompleted: new Date(year).toISOString(),
    }).subscribe({
      next: created => {
        this.qualifications.update(list => [created, ...list]);
        this.saving.set(false);
        this.autofillStore.removeQualification(item.id);
        this.toast.show(`"${created.name}" added.`, 'success');
        if (this.qualifications().length === 1) this.saved.emit();
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; },
    });
  }
}