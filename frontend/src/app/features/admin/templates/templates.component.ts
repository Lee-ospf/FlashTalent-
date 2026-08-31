import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import * as mammoth from 'mammoth';

import { ToastService } from '../../../core/services/toast.service';
import {
  PrescreeningService, PrescreeningTemplateResponse, validatePrescreeningFile,
  previewKindFor, FilePreviewKind
} from '../../../core/services/prescreening.service';
import { OfferLetterService, OfferLetterTemplateResponse } from '../../../core/services/offer-letter.service';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container tp-page">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-file-stack"></i> Templates</h2>
          <p class="page-sub">Manage the pre-screening assessment template and the offer letter template used across all applications.</p>
        </div>
      </div>

      <div class="tp-grid">

        <!-- Pre-screening template -->
        <mat-card class="mat-elevation-z1 tp-card">
          <mat-card-content style="padding:24px 26px">
            <div class="tp-card-header">
              <div class="tp-icon tp-icon-ps"><i class="ti ti-clipboard-list"></i></div>
              <div>
                <div class="vd-title-sm">Pre-screening assessment template</div>
                <div class="vd-ref">The blank form candidates fill in and upload back after being shortlisted</div>
              </div>
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            @if (psLoading()) {
              <div class="empty-state" style="padding:1rem 0"><mat-spinner diameter="24"></mat-spinner></div>
            } @else {
              @if (psTemplate(); as t) {
                <div class="tmpl-ready">
                  <span><i class="ti ti-file-check"></i> {{ t.originalFileName }} · uploaded {{ formatDateTime(t.uploadedAt) }}</span>
                  <div style="display:flex;gap:8px;flex-shrink:0">
                    <button type="button" class="btn-secondary doc-view-btn"
                            [disabled]="isFileActionLoading('view')"
                            (click)="viewFile(t.fileUrl, t.originalFileName, 'view')">
                      @if (isFileActionLoading('view')) { <mat-spinner diameter="14" style="display:inline-block;margin-right:2px"></mat-spinner> } @else { <i class="ti ti-eye"></i> }
                      View
                    </button>
                    <button type="button" class="btn-secondary doc-view-btn"
                            [disabled]="isFileActionLoading('dl')"
                            (click)="downloadFile(t.fileUrl, t.originalFileName, 'dl')">
                      @if (isFileActionLoading('dl')) { <mat-spinner diameter="14" style="display:inline-block;margin-right:2px"></mat-spinner> } @else { <i class="ti ti-download"></i> }
                      Download
                    </button>
                  </div>
                </div>
              } @else {
                <div class="tmpl-warning">
                  <i class="ti ti-alert-triangle"></i>
                  No pre-screening template has been uploaded yet. Applications can't send a pre-screening form until one exists.
                </div>
              }
            }

            <div class="tmpl-upload-row">
              <input type="file" class="ps-file-input" id="ps-tmpl-file" accept=".pdf,.doc,.docx" (change)="onPsFileSelected($event)">
              <label class="btn-primary" for="ps-tmpl-file">
                @if (uploadingPs()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-upload"></i> }
                {{ psTemplate() ? 'Replace template' : 'Upload template' }}
              </label>
              <span class="form-note">PDF, DOC or DOCX · max 5 MB</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Offer letter template -->
        <mat-card class="mat-elevation-z1 tp-card">
          <mat-card-content style="padding:24px 26px">
            <div class="tp-card-header">
              <div class="tp-icon tp-icon-offer"><i class="ti ti-file-certificate"></i></div>
              <div>
                <div class="vd-title-sm">Offer letter template</div>
                <div class="vd-ref">The HTML used to generate offer letters for accepted candidates</div>
              </div>
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            @if (olLoading()) {
              <div class="empty-state" style="padding:1rem 0"><mat-spinner diameter="24"></mat-spinner></div>
            } @else {
              @if (olTemplate(); as t) {
                <div class="tmpl-ready">
                  <span><i class="ti ti-file-check"></i> Template ready · saved {{ formatDateTime(t.uploadedAt) }}</span>
                </div>
              } @else {
                <div class="tmpl-warning">
                  <i class="ti ti-alert-triangle"></i>
                  No offer letter template has been created yet. Offers can't be generated until one exists.
                </div>
              }

              <p class="vd-body" style="margin-top:14px">
                Paste the HTML for the offer letter. Wrap each of these field names in double curly braces as placeholders -
                CandidateName, JobTitle, Salary, StartDate, ClosingDate, Location, EmploymentType - and they'll be filled in automatically.
              </p>
              <textarea class="assess-comment" rows="10" placeholder="&lt;html&gt;…&lt;/html&gt;"
                        style="margin-top:8px;font-family:'SFMono-Regular',Consolas,monospace;font-size:12px"
                        [(ngModel)]="olTemplateDraft"></textarea>
              <div class="assess-footer">
                <span class="form-note"><i class="ti ti-info-circle"></i> Saving replaces the template for every future offer</span>
                <button class="btn-primary" [disabled]="!olTemplateDraft.trim() || savingOl()" (click)="saveOlTemplate()">
                  @if (savingOl()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-device-floppy"></i> }
                  Save template
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>

      </div>
    </div>

    @if (previewingFile(); as pf) {
      <div class="ps-modal-backdrop" (click)="closeFilePreview()">
        <div class="ps-modal" (click)="$event.stopPropagation()">
          <div class="ps-modal-header">
            <div><i class="ti ti-file-description"></i> {{ pf.fileName }}</div>
            <button class="ps-modal-close" (click)="closeFilePreview()"><i class="ti ti-x"></i></button>
          </div>
          <div class="ps-modal-body">
            @if (pf.kind === 'pdf') {
              <iframe [src]="pf.safeUrl" class="ps-modal-iframe"></iframe>
            } @else if (pf.kind === 'image') {
              <div class="ps-modal-image-wrap"><img [src]="pf.safeUrl" alt="{{ pf.fileName }}"></div>
            } @else if (pf.kind === 'docx') {
              @if (docxConverting()) {
                <div class="empty-state"><mat-spinner diameter="28"></mat-spinner></div>
              } @else if (docxError()) {
                <div class="empty-state">
                  <i class="ti ti-file-unknown"></i>
                  <p>Couldn't render this document. Download it to view the contents.</p>
                </div>
              } @else if (docxHtml()) {
                <div class="ps-docx-preview" [innerHTML]="docxHtml()"></div>
              }
            } @else {
              <div class="empty-state">
                <i class="ti ti-file-unknown"></i>
                <p>Preview isn't available for this file type. Download it to view the contents.</p>
              </div>
            }
          </div>
          <div class="ps-modal-footer">
            <button class="btn-secondary" (click)="closeFilePreview()">Close</button>
            <button class="btn-primary" (click)="downloadFromPreview()">
              <i class="ti ti-download"></i> Download
            </button>
          </div>
        </div>
      </div>
    }

    <style>
      .tp-page { max-width: 1200px; }
      .tp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
      @media (max-width: 900px) { .tp-grid { grid-template-columns: 1fr; } }

      .tp-card { border-radius: 16px !important; height: 100%; display: flex; flex-direction: column; }
      .tp-card mat-card-content { display: flex; flex-direction: column; flex: 1; }
      .tp-card-header { display: flex; align-items: center; gap: 14px; }
      .tp-icon {
        width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
        background: var(--surface-2); border: 1px solid var(--border); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 17px;
      }
      .tp-icon-ps { background: var(--blue-bg); border-color: rgba(13,71,161,0.2); color: var(--blue); }
      .tp-icon-offer { background: var(--green-bg); border-color: rgba(45,122,79,0.25); color: var(--green); }
      .vd-title-sm { font-size: 15px; font-weight: 700; color: var(--text); }
      .vd-ref { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
      .vd-body { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

      .tmpl-warning {
        display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #8a5a00;
        background: #fff8e1; border: 1px solid #ffe4a3; border-radius: 10px; padding: 10px 12px;
      }
      .tmpl-ready {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        font-size: 12.5px; color: #1a5c35; background: var(--green-bg, #e8f5e9);
        border-radius: 10px; padding: 10px 12px;
      }
      .tmpl-ready i { margin-right: 4px; }

      .tmpl-upload-row { display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
      .ps-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }

      .assess-comment {
        width: 100%; font-size: 13px; padding: 10px 12px; resize: vertical;
        border-radius: var(--radius); border: 1.5px solid rgba(0,0,0,0.15);
        background: #fff; color: var(--text); font-family: inherit;
      }
      .assess-comment:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgba(26,39,68,0.08); }
      .assess-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
      .move-btn-spinner { display: inline-block; }
      .move-btn-spinner ::ng-deep circle { stroke: #fff; }

      .doc-view-btn {
        padding: 6px 14px; font-size: 12px; flex-shrink: 0; border-radius: 20px;
        background: var(--blue-bg); border-color: var(--blue); color: var(--blue);
      }
      .doc-view-btn:hover { background: var(--blue); border-color: var(--blue); color: #fff; }
      .doc-view-btn:disabled { opacity: 0.6; cursor: default; }

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
      .ps-modal-image-wrap { display: flex; align-items: center; justify-content: center; min-height: 300px; padding: 16px; }
      .ps-modal-image-wrap img { max-width: 100%; max-height: 65vh; border-radius: 6px; box-shadow: var(--shadow-sm); }
      .ps-docx-preview {
        background: #fff; padding: 32px 40px; max-height: 65vh; overflow: auto;
        font-size: 14px; line-height: 1.6; color: var(--text);
      }
      .ps-docx-preview :is(h1,h2,h3,h4,h5,h6) { color: var(--navy); margin: 1.2em 0 0.5em; }
      .ps-docx-preview p { margin: 0 0 0.8em; }
      .ps-docx-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
      .ps-docx-preview td, .ps-docx-preview th { border: 1px solid var(--border); padding: 6px 10px; }
      .ps-docx-preview img { max-width: 100%; }
      .ps-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--border); background: #fff; }
    </style>
  `
})
export class TemplatesComponent implements OnInit {
  private prescreening = inject(PrescreeningService);
  private offerLetter = inject(OfferLetterService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  psTemplate = signal<PrescreeningTemplateResponse | null>(null);
  psLoading = signal(true);
  uploadingPs = signal(false);

  olTemplate = signal<OfferLetterTemplateResponse | null>(null);
  olLoading = signal(true);
  olTemplateDraft = '';
  savingOl = signal(false);

  // ── File view/download (pre-screening template) ────────────────
  private fileActionKey = signal<string | null>(null);
  previewingFile = signal<{
    fileName: string;
    kind: FilePreviewKind;
    safeUrl: SafeResourceUrl;
    objectUrl: string;
  } | null>(null);
  docxHtml = signal<SafeHtml | null>(null);
  docxConverting = signal(false);
  docxError = signal(false);

  ngOnInit(): void {
    this.prescreening.getTemplate().subscribe({
      next: t => { this.psTemplate.set(t); this.psLoading.set(false); },
      error: () => { this.psTemplate.set(null); this.psLoading.set(false); }
    });

    this.offerLetter.getTemplate().subscribe({
      next: t => { this.olTemplate.set(t); this.olLoading.set(false); if (t) this.olTemplateDraft = t.htmlContent; },
      error: () => { this.olTemplate.set(null); this.olLoading.set(false); }
    });
  }

  fileHref(fileUrl: string): string {
    return this.prescreening.fileHref(fileUrl);
  }

  isFileActionLoading(key: string): boolean {
    return this.fileActionKey() === key;
  }

  viewFile(relativeUrl: string | null | undefined, fileName: string, key: string): void {
    if (!relativeUrl) return;
    this.fileActionKey.set(key);
    this.prescreening.getFileBlob(relativeUrl).subscribe({
      next: (blob) => {
        this.fileActionKey.set(null);
        const objectUrl = URL.createObjectURL(blob);
        const kind = previewKindFor(fileName);
        this.previewingFile.set({
          fileName,
          kind,
          safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl),
          objectUrl
        });
        this.docxHtml.set(null);
        this.docxError.set(false);
        if (kind === 'docx') this.convertDocxPreview(blob);
      },
      error: (err: Error) => {
        this.fileActionKey.set(null);
        this.toast.show(err.message || 'Could not open the document.', 'error');
      }
    });
  }

  // .docx has no native browser renderer, but it's a zipped XML format we
  // can convert to HTML entirely client-side with mammoth - no server
  // changes or public URL needed, unlike Office/Google's online viewers.
  private convertDocxPreview(blob: Blob): void {
    this.docxConverting.set(true);
    blob.arrayBuffer()
      .then(arrayBuffer => mammoth.convertToHtml({ arrayBuffer }))
      .then(result => {
        this.docxConverting.set(false);
        this.docxHtml.set(this.sanitizer.bypassSecurityTrustHtml(result.value));
      })
      .catch(() => {
        this.docxConverting.set(false);
        this.docxError.set(true);
      });
  }

  downloadFile(relativeUrl: string | null | undefined, fileName: string, key: string): void {
    if (!relativeUrl) return;
    this.fileActionKey.set(key);
    this.prescreening.downloadFile(relativeUrl, fileName).subscribe({
      next: () => this.fileActionKey.set(null),
      error: (err: Error) => {
        this.fileActionKey.set(null);
        this.toast.show(err.message || 'Could not download the document.', 'error');
      }
    });
  }

  downloadFromPreview(): void {
    const pf = this.previewingFile();
    if (!pf) return;
    const a = document.createElement('a');
    a.href = pf.objectUrl;
    a.download = pf.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  closeFilePreview(): void {
    const pf = this.previewingFile();
    if (pf) URL.revokeObjectURL(pf.objectUrl);
    this.previewingFile.set(null);
    this.docxHtml.set(null);
    this.docxConverting.set(false);
    this.docxError.set(false);
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  onPsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const error = validatePrescreeningFile(file);
    if (error) { this.toast.show(error, 'error'); return; }

    this.uploadingPs.set(true);
    this.prescreening.uploadTemplate(file).subscribe({
      next: t => { this.psTemplate.set(t); this.uploadingPs.set(false); this.toast.show('Pre-screening template uploaded.', 'success'); },
      error: (err: Error) => { this.uploadingPs.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  saveOlTemplate(): void {
    if (!this.olTemplateDraft.trim()) return;
    this.savingOl.set(true);
    this.offerLetter.uploadTemplate(this.olTemplateDraft).subscribe({
      next: t => { this.olTemplate.set(t); this.savingOl.set(false); this.toast.show('Offer letter template saved.', 'success'); },
      error: (err: Error) => { this.savingOl.set(false); this.toast.show(err.message, 'error'); }
    });
  }
}
