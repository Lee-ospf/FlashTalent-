import { Component, inject, signal, computed, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { DocumentService, validateFileClient } from '../../core/services/document.service';
import { ResumeAutofillOrchestratorService } from '../../core/services/resume-autofill-orchestrator.service';
import { ToastService } from '../../core/services/toast.service';
import { CandidateDocumentResponse } from '../../core/models';

@Component({
  selector: 'app-cv-upload-step',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div [class.page-container]="!embedded" [class.step-body-padded]="embedded">
      @if (!embedded) {
        <div class="page-header">
          <div>
            <h2 class="page-title"><i class="ti ti-file-cv"></i> Upload your CV</h2>
            <p class="page-sub">We'll read it and suggest skills, qualifications and experience for you to confirm as you go.</p>
          </div>
        </div>
      }

      <div class="cv-slot" [class.cv-slot--uploaded]="cvDoc()" [class.cv-slot--dragover]="dragOver()"
           (dragover)="onDragOver($event)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">

        <div class="cv-icon" [class.cv-icon--done]="cvDoc()">
          <i class="ti" [class.ti-file-cv]="!cvDoc()" [class.ti-file-check]="cvDoc()"></i>
        </div>

        <div class="cv-info">
          @if (cvDoc()) {
            <div class="cv-name">{{ cvDoc()!.originalFileName }}</div>
            <div class="cv-sub">
              @if (orchestrator.parsing()) {
                <mat-spinner diameter="14" style="display:inline-block;vertical-align:middle;margin-right:6px"></mat-spinner>
                Reading your CV…
              } @else {
                CV uploaded — suggestions are ready on the Skills, Experience and Qualifications steps.
              }
            </div>
          } @else {
            <div class="cv-name">No CV uploaded yet</div>
            <div class="cv-sub">PDF, DOC, DOCX · max 5 MB · drag a file here or click Upload</div>
          }
        </div>

        <div class="cv-actions">
          @if (uploading()) {
            <mat-spinner diameter="22"></mat-spinner>
          } @else {
            <button mat-raised-button color="primary" style="border-radius:8px" (click)="fileInput.click()">
              <i class="ti" [class.ti-upload]="!cvDoc()" [class.ti-refresh]="cvDoc()"></i>
              {{ cvDoc() ? 'Replace' : 'Upload' }}
            </button>
          }
        </div>
      </div>

      <input #fileInput type="file" accept=".pdf,.doc,.docx" style="display:none" (change)="onFileChange($event)">
    </div>
  `,
  styles: [`
    .step-body-padded { padding: 1.5rem; }
    .cv-slot {
      display: flex; align-items: center; gap: 16px; padding: 20px;
      border: 1.5px solid var(--border); border-radius: 12px; background: var(--surface); position: relative;
    }
    .cv-slot--uploaded { border-color: #2D7A4F; background: linear-gradient(to right, rgba(230,244,236,0.4), #fff); }
    .cv-slot--dragover { border-color: var(--green) !important; box-shadow: 0 0 0 3px rgba(45,122,79,0.15); }
    .cv-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: var(--surface-2); color: var(--text-muted); flex-shrink: 0; }
    .cv-icon--done { background: var(--green-bg); color: var(--green); }
    .cv-info { flex: 1; min-width: 0; }
    .cv-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .cv-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  `],
})
export class CvUploadStepComponent implements OnInit {
  @Input() embedded = false;
  @Output() saved = new EventEmitter<void>();

  private state = inject(CandidateStateService);
  private docService = inject(DocumentService);
  private toast = inject(ToastService);
  orchestrator = inject(ResumeAutofillOrchestratorService);

  private allDocs = signal<CandidateDocumentResponse[]>([]);
  cvDoc = computed(() =>
    this.allDocs()
      .filter(d => d.documentType === 'CV')
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0],
  );

  uploading = signal(false);
  dragOver = signal(false);

  ngOnInit(): void { this.load(); }

  private load(): void {
    const p = this.state.profile();
    if (!p) return;
    this.docService.getAll(p.candidateId).subscribe({ next: d => this.allDocs.set(d) });
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.dragOver.set(true); }
  onDrop(e: DragEvent): void {
    e.preventDefault(); this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.handleFile(file);
  }
  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.handleFile(file);
    (e.target as HTMLInputElement).value = '';
  }

  private handleFile(file: File): void {
    const err = validateFileClient(file);
    if (err) { this.toast.show(err, 'error'); return; }

    const p = this.state.profile();
    if (!p) return;

    this.uploading.set(true);
    this.docService.upload(p.candidateId, 'CV', file).subscribe({
      next: uploaded => {
        this.allDocs.update(list => [...list, uploaded]);
        this.uploading.set(false);
        this.toast.show(`"${uploaded.originalFileName}" uploaded.`, 'success');
        // Upload IS the autofill trigger — no separate button to click.
        this.orchestrator.run(p.candidateId);
        this.saved.emit();
      },
      error: (e: Error) => { this.uploading.set(false); this.toast.show(e.message, 'error'); },
    });
  }
}