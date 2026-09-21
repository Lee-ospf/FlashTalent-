import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DomSanitizer,
  SafeResourceUrl,
  SafeHtml,
} from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import * as mammoth from 'mammoth';

import { ToastService } from '../../../core/services/toast.service';
import {
  PrescreeningService,
  PrescreeningTemplateResponse,
  validatePrescreeningFile,
  previewKindFor,
  FilePreviewKind,
} from '../../../core/services/prescreening.service';
import {
  OfferLetterService,
  OfferLetterTemplateResponse,
} from '../../../core/services/offer-letter.service';
import {
  NotificationTemplateService,
  NotificationTemplate,
  AvailableCombination,
} from '../../../core/services/notification-template.service';
@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="page-container tp-page">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-file-stack"></i> Templates</h2>
          <p class="page-sub">
            Manage the pre-screening assessment template and the offer letter
            template used across all applications.
          </p>
        </div>
      </div>

      <div class="tp-grid">
        <!-- Pre-screening template -->
        <mat-card class="mat-elevation-z1 tp-card">
          <mat-card-content style="padding:24px 26px">
            <div class="tp-card-header">
              <div class="tp-icon tp-icon-ps">
                <i class="ti ti-clipboard-list"></i>
              </div>
              <div>
                <div class="vd-title-sm">Pre-screening assessment template</div>
                <div class="vd-ref">
                  The blank form candidates fill in and upload back after being
                  shortlisted
                </div>
              </div>
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            @if (psLoading()) {
              <div class="empty-state" style="padding:1rem 0">
                <mat-spinner diameter="24"></mat-spinner>
              </div>
            } @else {
              @if (psTemplate(); as t) {
                <div class="tmpl-ready">
                  <span
                    ><i class="ti ti-file-check"></i> {{ t.originalFileName }} ·
                    uploaded {{ formatDateTime(t.uploadedAt) }}</span
                  >
                  <div style="display:flex;gap:8px;flex-shrink:0">
                    <button
                      type="button"
                      class="btn-secondary doc-view-btn"
                      [disabled]="isFileActionLoading('view')"
                      (click)="viewFile(t.fileUrl, t.originalFileName, 'view')"
                    >
                      @if (isFileActionLoading('view')) {
                        <mat-spinner
                          diameter="14"
                          style="display:inline-block;margin-right:2px"
                        ></mat-spinner>
                      } @else {
                        <i class="ti ti-eye"></i>
                      }
                      View
                    </button>
                    <button
                      type="button"
                      class="btn-secondary doc-view-btn"
                      [disabled]="isFileActionLoading('dl')"
                      (click)="
                        downloadFile(t.fileUrl, t.originalFileName, 'dl')
                      "
                    >
                      @if (isFileActionLoading('dl')) {
                        <mat-spinner
                          diameter="14"
                          style="display:inline-block;margin-right:2px"
                        ></mat-spinner>
                      } @else {
                        <i class="ti ti-download"></i>
                      }
                      Download
                    </button>
                  </div>
                </div>
              } @else {
                <div class="tmpl-warning">
                  <i class="ti ti-alert-triangle"></i>
                  No pre-screening template has been uploaded yet. Applications
                  can't send a pre-screening form until one exists.
                </div>
              }
            }

            <div class="tmpl-upload-row">
              <input
                type="file"
                class="ps-file-input"
                id="ps-tmpl-file"
                accept=".pdf,.doc,.docx"
                (change)="onPsFileSelected($event)"
              />
              <label class="btn-primary" for="ps-tmpl-file">
                @if (uploadingPs()) {
                  <mat-spinner
                    diameter="14"
                    class="move-btn-spinner"
                  ></mat-spinner>
                } @else {
                  <i class="ti ti-upload"></i>
                }
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
              <div class="tp-icon tp-icon-offer">
                <i class="ti ti-file-certificate"></i>
              </div>
              <div>
                <div class="vd-title-sm">Offer letter template</div>
                <div class="vd-ref">
                  The HTML used to generate offer letters for accepted
                  candidates
                </div>
              </div>
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            @if (olLoading()) {
              <div class="empty-state" style="padding:1rem 0">
                <mat-spinner diameter="24"></mat-spinner>
              </div>
            } @else {
              @if (olTemplate(); as t) {
                <div class="tmpl-ready">
                  <span
                    ><i class="ti ti-file-check"></i> Template ready · saved
                    {{ formatDateTime(t.uploadedAt) }}</span
                  >
                </div>
              } @else {
                <div class="tmpl-warning">
                  <i class="ti ti-alert-triangle"></i>
                  No offer letter template has been created yet. Offers can't be
                  generated until one exists.
                </div>
              }

              <p class="vd-body" style="margin-top:14px">
                Paste the HTML for the offer letter. Wrap each of these field
                names in double curly braces as placeholders - CandidateName,
                JobTitle, Salary, StartDate, ClosingDate, Location,
                EmploymentType - and they'll be filled in automatically.
              </p>
              <textarea
                class="assess-comment"
                rows="10"
                placeholder="&lt;html&gt;…&lt;/html&gt;"
                style="margin-top:8px;font-family:'SFMono-Regular',Consolas,monospace;font-size:12px"
                [(ngModel)]="olTemplateDraft"
              ></textarea>
              <div class="assess-footer">
                <span class="form-note"
                  ><i class="ti ti-info-circle"></i> Saving replaces the
                  template for every future offer</span
                >
                <button
                  class="btn-primary"
                  [disabled]="!olTemplateDraft.trim() || savingOl()"
                  (click)="saveOlTemplate()"
                >
                  @if (savingOl()) {
                    <mat-spinner
                      diameter="14"
                      class="move-btn-spinner"
                    ></mat-spinner>
                  } @else {
                    <i class="ti ti-device-floppy"></i>
                  }
                  Save template
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
      <mat-card class="mat-elevation-z1 tp-card" style="margin-top: 20px;">
        <mat-card-content style="padding:24px 26px">
          <div class="tp-card-header" style="justify-content: space-between;">
            <div style="display:flex;align-items:center;gap:14px">
              <div
                class="tp-icon"
                style="background: var(--surface-2); color: var(--navy);"
              >
                <i class="ti ti-bell-ringing"></i>
              </div>
              <div>
                <div class="vd-title-sm">Notification templates</div>
                <div class="vd-ref">
                  Subject and body sent for each notification type, per channel
                </div>
              </div>
            </div>
            <button class="btn-primary" (click)="openCreateModal()">
              <i class="ti ti-plus"></i> Add template
            </button>
          </div>

          <mat-divider style="margin:18px 0"></mat-divider>

          @if (ntLoading()) {
            <div class="empty-state" style="padding:1rem 0">
              <mat-spinner diameter="24"></mat-spinner>
            </div>
          } @else {
            <table class="nt-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Subject</th>
                  <th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (group of paginatedGroups(); track group.type) {
                  <tr
                    class="nt-group-header"
                    (click)="toggleGroup(group.type)"
                    style="cursor:pointer"
                  >
                    <td colspan="3">
                      <i
                        class="ti"
                        [class.ti-chevron-down]="isExpanded(group.type)"
                        [class.ti-chevron-right]="!isExpanded(group.type)"
                      ></i>
                      {{ group.type }}
                    </td>
                  </tr>
                  @if (isExpanded(group.type)) {
                    @for (
                      t of group.templates;
                      track t.notificationTemplateId
                    ) {
                      <tr class="nt-row">
                        <td>
                          <span
                            class="nt-channel-pill"
                            [class.nt-channel-email]="t.channel === 'Email'"
                          >
                            <i
                              class="ti"
                              [class.ti-mail]="t.channel === 'Email'"
                              [class.ti-device-mobile]="t.channel === 'InApp'"
                            ></i>
                            {{ t.channel === 'InApp' ? 'In-app' : t.channel }}
                          </span>
                        </td>
                        <td class="nt-subject-cell">
                          {{ t.subject || '(no subject)' }}
                        </td>
                        <td style="text-align:right;white-space:nowrap">
                          <button
                            class="btn-secondary nt-icon-btn"
                            (click)="openPreviewModal(t)"
                          >
                            <i class="ti ti-eye"></i>
                          </button>
                          <button
                            class="btn-secondary nt-icon-btn nt-edit-btn"
                            (click)="openEditModal(t)"
                          >
                            <i class="ti ti-pencil"></i>
                          </button>
                        </td>
                      </tr>
                    }
                  }
                }
              </tbody>
            </table>

            <div class="nt-pagination">
              <span class="form-note"
                >{{ notificationTemplates().length }} templates across
                {{ groupedTemplates().length }} types</span
              >
              <div class="nt-page-controls">
                <button
                  class="btn-secondary nt-icon-btn"
                  [disabled]="currentPage() === 1"
                  (click)="goToPage(currentPage() - 1)"
                >
                  <i class="ti ti-chevron-left"></i>
                </button>
                <span class="form-note"
                  >Page {{ currentPage() }} of {{ totalPages() }}</span
                >
                <button
                  class="btn-secondary nt-icon-btn"
                  [disabled]="currentPage() === totalPages()"
                  (click)="goToPage(currentPage() + 1)"
                >
                  <i class="ti ti-chevron-right"></i>
                </button>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if (modalMode(); as mode) {
        <div class="ps-modal-backdrop" (click)="closeModal()">
          <div
            class="ps-modal"
            style="width:min(620px,100%)"
            (click)="$event.stopPropagation()"
          >
            <div class="ps-modal-header">
              <div>
                <i class="ti ti-bell-ringing"></i>
                {{
                  mode === 'create'
                    ? 'Add template'
                    : mode === 'edit'
                      ? 'Edit template'
                      : 'Preview'
                }}
                @if (modalType) {
                  &middot; {{ modalType }}
                  @if (modalChannel) {
                    &middot;
                    {{ modalChannel === 'InApp' ? 'In-app' : modalChannel }}
                  }
                }
              </div>
              <button class="ps-modal-close" (click)="closeModal()">
                <i class="ti ti-x"></i>
              </button>
            </div>
            <div
              class="ps-modal-body"
              style="padding:18px;background:var(--surface-2)"
            >
              @if (mode === 'create') {
                <label class="form-note">TYPE</label>
                <select
                  class="assess-comment"
                  style="margin:4px 0 12px"
                  [(ngModel)]="createType"
                  (ngModelChange)="onCreateTypeChange()"
                >
                  <option [ngValue]="null">Select a type&hellip;</option>
                  @for (type of availableTypes(); track type) {
                    <option [ngValue]="type">{{ type }}</option>
                  }
                </select>

                <label class="form-note">CHANNEL</label>
                <select
                  class="assess-comment"
                  style="margin:4px 0 12px"
                  [(ngModel)]="createChannel"
                >
                  <option [ngValue]="null">Select a channel&hellip;</option>
                  @for (ch of availableChannelsForType(createType); track ch) {
                    <option [ngValue]="ch">
                      {{ ch === 'InApp' ? 'In-app' : ch }}
                    </option>
                  }
                </select>
              }

              @if (mode !== 'preview') {
                <label class="form-note">SUBJECT</label>
                <input
                  class="assess-comment"
                  style="margin:4px 0 12px"
                  [(ngModel)]="editSubject"
                />

                <label class="form-note">BODY</label>
                <textarea
                  #bodyInput
                  class="assess-comment"
                  rows="4"
                  style="margin:4px 0 8px;font-family:'SFMono-Regular',Consolas,monospace;font-size:12px"
                  [(ngModel)]="editBody"
                ></textarea>

                @if (currentPlaceholders(); as tokens) {
                  <div style="margin-bottom:14px">
                    <span class="form-note" style="margin-right:6px"
                      >Insert:</span
                    >
                    @for (token of tokens; track token) {
                      <button
                        class="nt-token-btn"
                        (click)="insertToken(bodyInput, token)"
                      >
                        {{ token }}
                      </button>
                    }
                  </div>
                }
              }

              <div
                style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px"
              >
                <div class="form-note" style="margin-bottom:6px">PREVIEW</div>
                <div
                  style="font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:4px"
                >
                  {{ renderedPreview().subject }}
                </div>
                <div
                  style="font-size:12.5px;color:var(--text-muted);line-height:1.5"
                >
                  {{ renderedPreview().body }}
                </div>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="btn-secondary" (click)="closeModal()">
                {{ mode === 'preview' ? 'Close' : 'Cancel' }}
              </button>
              @if (mode === 'edit') {
                <button
                  class="btn-primary"
                  [disabled]="!editBody.trim() || ntSaving()"
                  (click)="saveEdit()"
                >
                  @if (ntSaving()) {
                    <mat-spinner
                      diameter="14"
                      class="move-btn-spinner"
                    ></mat-spinner>
                  } @else {
                    <i class="ti ti-device-floppy"></i>
                  }
                  Save
                </button>
              }
              @if (mode === 'create') {
                <button
                  class="btn-primary"
                  [disabled]="
                    !createType ||
                    !createChannel ||
                    !editBody.trim() ||
                    ntSaving()
                  "
                  (click)="saveCreate()"
                >
                  @if (ntSaving()) {
                    <mat-spinner
                      diameter="14"
                      class="move-btn-spinner"
                    ></mat-spinner>
                  } @else {
                    <i class="ti ti-device-floppy"></i>
                  }
                  Create
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>

    @if (previewingFile(); as pf) {
      <div class="ps-modal-backdrop" (click)="closeFilePreview()">
        <div class="ps-modal" (click)="$event.stopPropagation()">
          <div class="ps-modal-header">
            <div><i class="ti ti-file-description"></i> {{ pf.fileName }}</div>
            <button class="ps-modal-close" (click)="closeFilePreview()">
              <i class="ti ti-x"></i>
            </button>
          </div>
          <div class="ps-modal-body">
            @if (pf.kind === 'pdf') {
              <iframe [src]="pf.safeUrl" class="ps-modal-iframe"></iframe>
            } @else if (pf.kind === 'image') {
              <div class="ps-modal-image-wrap">
                <img [src]="pf.safeUrl" alt="{{ pf.fileName }}" />
              </div>
            } @else if (pf.kind === 'docx') {
              @if (docxConverting()) {
                <div class="empty-state">
                  <mat-spinner diameter="28"></mat-spinner>
                </div>
              } @else if (docxError()) {
                <div class="empty-state">
                  <i class="ti ti-file-unknown"></i>
                  <p>
                    Couldn't render this document. Download it to view the
                    contents.
                  </p>
                </div>
              } @else if (docxHtml()) {
                <div class="ps-docx-preview" [innerHTML]="docxHtml()"></div>
              }
            } @else {
              <div class="empty-state">
                <i class="ti ti-file-unknown"></i>
                <p>
                  Preview isn't available for this file type. Download it to
                  view the contents.
                </p>
              </div>
            }
          </div>
          <div class="ps-modal-footer">
            <button class="btn-secondary" (click)="closeFilePreview()">
              Close
            </button>
            <button class="btn-primary" (click)="downloadFromPreview()">
              <i class="ti ti-download"></i> Download
            </button>
          </div>
        </div>
      </div>
    }

    <style>
      .tp-page {
        max-width: 1200px;
      }
      .tp-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        align-items: stretch;
      }
      @media (max-width: 900px) {
        .tp-grid {
          grid-template-columns: 1fr;
        }
      }

      .tp-card {
        border-radius: 16px !important;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .tp-card mat-card-content {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .tp-card-header {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .tp-icon {
        width: 40px;
        height: 40px;
        border-radius: 11px;
        flex-shrink: 0;
        background: var(--surface-2);
        border: 1px solid var(--border);
        color: var(--navy);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
      }
      .tp-icon-ps {
        background: var(--blue-bg);
        border-color: rgba(13, 71, 161, 0.2);
        color: var(--blue);
      }
      .tp-icon-offer {
        background: var(--green-bg);
        border-color: rgba(45, 122, 79, 0.25);
        color: var(--green);
      }
      .vd-title-sm {
        font-size: 15px;
        font-weight: 700;
        color: var(--text);
      }
      .vd-ref {
        font-size: 11.5px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .vd-body {
        font-size: 13px;
        color: var(--text-muted);
        line-height: 1.6;
      }

      .tmpl-warning {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12.5px;
        color: #8a5a00;
        background: #fff8e1;
        border: 1px solid #ffe4a3;
        border-radius: 10px;
        padding: 10px 12px;
      }
      .tmpl-ready {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 12.5px;
        color: #1a5c35;
        background: var(--green-bg, #e8f5e9);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .tmpl-ready i {
        margin-right: 4px;
      }

      .tmpl-upload-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      .ps-file-input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        overflow: hidden;
      }

      .assess-comment {
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
      .assess-comment:focus {
        outline: none;
        border-color: var(--navy);
        box-shadow: 0 0 0 3px rgba(26, 39, 68, 0.08);
      }
      .assess-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 14px;
        flex-wrap: wrap;
      }
      .move-btn-spinner {
        display: inline-block;
      }
      .move-btn-spinner ::ng-deep circle {
        stroke: #fff;
      }

      .doc-view-btn {
        padding: 6px 14px;
        font-size: 12px;
        flex-shrink: 0;
        border-radius: 20px;
        background: var(--blue-bg);
        border-color: var(--blue);
        color: var(--blue);
      }
      .doc-view-btn:hover {
        background: var(--blue);
        border-color: var(--blue);
        color: #fff;
      }
      .doc-view-btn:disabled {
        opacity: 0.6;
        cursor: default;
      }

      .ps-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 20, 30, 0.55);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .ps-modal {
        background: #fff;
        border-radius: 14px;
        width: min(760px, 100%);
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
      .ps-modal-iframe {
        width: 100%;
        height: 65vh;
        border: none;
        display: block;
        background: #fff;
      }
      .ps-modal-image-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        padding: 16px;
      }
      .ps-modal-image-wrap img {
        max-width: 100%;
        max-height: 65vh;
        border-radius: 6px;
        box-shadow: var(--shadow-sm);
      }
      .ps-docx-preview {
        background: #fff;
        padding: 32px 40px;
        max-height: 65vh;
        overflow: auto;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text);
      }
      .ps-docx-preview :is(h1, h2, h3, h4, h5, h6) {
        color: var(--navy);
        margin: 1.2em 0 0.5em;
      }
      .ps-docx-preview p {
        margin: 0 0 0.8em;
      }
      .ps-docx-preview table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.8em 0;
      }
      .ps-docx-preview td,
      .ps-docx-preview th {
        border: 1px solid var(--border);
        padding: 6px 10px;
      }
      .ps-docx-preview img {
        max-width: 100%;
      }
      .ps-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 18px;
        border-top: 1px solid var(--border);
        background: #fff;
      }

      .nt-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12.5px;
      }
      .nt-table th {
        text-align: left;
        color: var(--text-muted);
        font-weight: 600;
        padding: 8px 6px;
        border-bottom: 1px solid var(--border);
      }
      .nt-group-header td {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .nt-row {
        background: var(--surface-2);
      }
      .nt-row td {
        padding: 8px 6px;
      }
      .nt-row td:first-child {
        padding-left: 22px;
      }
      .nt-subject-cell {
        color: var(--text-muted);
      }
      .nt-channel-pill {
        background: var(--green-bg);
        color: var(--green);
        border-radius: 20px;
        padding: 3px 10px;
        font-size: 11px;
      }
      .nt-channel-pill.nt-channel-email {
        background: var(--blue-bg);
        color: var(--blue);
      }
      .nt-icon-btn {
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 11px;
      }
      .nt-edit-btn {
        background: var(--blue-bg);
        border-color: var(--blue);
        color: var(--blue);
        margin-left: 4px;
      }
      .nt-token-btn {
        background: var(--blue-bg);
        border: 1px solid var(--blue);
        color: var(--blue);
        border-radius: 20px;
        padding: 3px 10px;
        font-size: 11px;
        margin-right: 6px;
        cursor: pointer;
      }
      .nt-group-header td {
  padding: 10px 6px;
  font-weight: 700;
  color: var(--text);
  border-top: 1px solid var(--border);
}
.nt-group-header:first-child td {
  border-top: none;
}
.nt-group-header:hover {
  background: var(--surface-2);
}

.nt-row {
  border-bottom: 1px solid var(--border);
}
.nt-row:hover {
  filter: brightness(0.98);
}

.nt-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.nt-page-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
    </style>
  `,
})
export class TemplatesComponent implements OnInit {
  private prescreening = inject(PrescreeningService);
  private offerLetter = inject(OfferLetterService);
  private notificationTemplates_ = inject(NotificationTemplateService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  psTemplate = signal<PrescreeningTemplateResponse | null>(null);
  psLoading = signal(true);
  uploadingPs = signal(false);

  olTemplate = signal<OfferLetterTemplateResponse | null>(null);
  olLoading = signal(true);
  olTemplateDraft = '';
  savingOl = signal(false);

  // New state
  expandedTypes = signal<Set<string>>(new Set());
  currentPage = signal(1);
  pageSize = 5; // groups per page

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.groupedTemplates().length / this.pageSize)),
  );

  notificationTemplates = signal<NotificationTemplate[]>([]);
  ntLoading = signal(true);
  ntSaving = signal(false);
  placeholders = signal<Record<string, string[]>>({});
  availableCombinations = signal<AvailableCombination[]>([]);

  //notification modal control
  modalMode = signal<'preview' | 'edit' | 'create' | null>(null);
  modalType = '';
  modalChannel = '';
  editingId: number | null = null;
  editSubject = '';
  editBody = '';
  createType: string | null = null;
  createChannel: string | null = null;

  paginatedGroups = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.groupedTemplates().slice(start, start + this.pageSize);
  });

  toggleGroup(type: string): void {
    const expanded = new Set(this.expandedTypes());
    if (expanded.has(type)) expanded.delete(type);
    else expanded.add(type);
    this.expandedTypes.set(expanded);
  }

  isExpanded(type: string): boolean {
    return this.expandedTypes().has(type);
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

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
      next: (t) => {
        this.psTemplate.set(t);
        this.psLoading.set(false);
      },
      error: () => {
        this.psTemplate.set(null);
        this.psLoading.set(false);
      },
    });

    this.offerLetter.getTemplate().subscribe({
      next: (t) => {
        this.olTemplate.set(t);
        this.olLoading.set(false);
        if (t) this.olTemplateDraft = t.htmlContent;
      },
      error: () => {
        this.olTemplate.set(null);
        this.olLoading.set(false);
      },
    });

    this.loadNotificationTemplates();
  }

  loadNotificationTemplates(): void {
    this.ntLoading.set(true);
    this.notificationTemplates_.getAll().subscribe({
      next: (t) => {
        this.notificationTemplates.set(t);
        this.ntLoading.set(false);
      },
      error: (err: Error) => {
        this.ntLoading.set(false);
        this.toast.show(err.message, 'error');
      },
    });
    this.notificationTemplates_.getPlaceholders().subscribe({
      next: (p) => this.placeholders.set(p),
      error: () => {},
    });
  }
  fileHref(fileUrl: string): string {
    return this.prescreening.fileHref(fileUrl);
  }

  isFileActionLoading(key: string): boolean {
    return this.fileActionKey() === key;
  }

  groupedTemplates = computed(() => {
    const groups = new Map<string, NotificationTemplate[]>();
    for (const t of this.notificationTemplates()) {
      if (!groups.has(t.notificationType)) groups.set(t.notificationType, []);
      groups.get(t.notificationType)!.push(t);
    }
    return Array.from(groups.entries()).map(([type, templates]) => ({
      type,
      templates,
    }));
  });

  availableTypes = computed(() =>
    Array.from(
      new Set(this.availableCombinations().map((c) => c.notificationType)),
    ),
  );

  availableChannelsForType(type: string | null): string[] {
    if (!type) return [];
    return this.availableCombinations()
      .filter((c) => c.notificationType === type)
      .map((c) => c.channel);
  }

  currentPlaceholders = computed(() => {
    const type =
      this.modalMode() === 'create' ? this.createType : this.modalType;
    return type ? (this.placeholders()[type] ?? []) : [];
  });

  renderedPreview = computed(() => {
    const render = (text: string) =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key) => `[${key}]`);
    return {
      subject: render(this.editSubject || '(no subject)'),
      body: render(this.editBody || ''),
    };
  });

  openPreviewModal(t: NotificationTemplate): void {
    this.modalType = t.notificationType;
    this.modalChannel = t.channel;
    this.editSubject = t.subject ?? '';
    this.editBody = t.bodyTemplate;
    this.modalMode.set('preview');
  }

  openEditModal(t: NotificationTemplate): void {
    this.editingId = t.notificationTemplateId;
    this.modalType = t.notificationType;
    this.modalChannel = t.channel;
    this.editSubject = t.subject ?? '';
    this.editBody = t.bodyTemplate;
    this.modalMode.set('edit');
  }

  openCreateModal(): void {
    this.editSubject = '';
    this.editBody = '';
    this.createType = null;
    this.createChannel = null;
    this.notificationTemplates_.getAvailableCombinations().subscribe({
      next: (c) => {
        this.availableCombinations.set(c);
        this.modalMode.set('create');
      },
      error: (err: Error) => this.toast.show(err.message, 'error'),
    });
  }

  onCreateTypeChange(): void {
    this.createChannel = null;
  }

  closeModal(): void {
    this.modalMode.set(null);
    this.editingId = null;
  }

  insertToken(textarea: HTMLTextAreaElement, token: string): void {
    const start = textarea.selectionStart ?? this.editBody.length;
    const end = textarea.selectionEnd ?? this.editBody.length;
    const insertText = `{{${token}}}`;
    this.editBody =
      this.editBody.slice(0, start) + insertText + this.editBody.slice(end);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + insertText.length,
        start + insertText.length,
      );
    });
  }

  saveEdit(): void {
    if (this.editingId === null) return;
    this.ntSaving.set(true);
    this.notificationTemplates_
      .update(this.editingId, this.editSubject || null, this.editBody)
      .subscribe({
        next: () => {
          this.ntSaving.set(false);
          this.toast.show('Template updated.', 'success');
          this.closeModal();
          this.loadNotificationTemplates();
        },
        error: (err: Error) => {
          this.ntSaving.set(false);
          this.toast.show(err.message, 'error');
        },
      });
  }

  saveCreate(): void {
    if (!this.createType || !this.createChannel) return;
    this.ntSaving.set(true);
    this.notificationTemplates_
      .create(
        this.createType,
        this.createChannel,
        this.editSubject || null,
        this.editBody,
      )
      .subscribe({
        next: () => {
          this.ntSaving.set(false);
          this.toast.show('Template created.', 'success');
          this.closeModal();
          this.loadNotificationTemplates();
        },
        error: (err: Error) => {
          this.ntSaving.set(false);
          this.toast.show(err.message, 'error');
        },
      });
  }
  viewFile(
    relativeUrl: string | null | undefined,
    fileName: string,
    key: string,
  ): void {
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
          objectUrl,
        });
        this.docxHtml.set(null);
        this.docxError.set(false);
        if (kind === 'docx') this.convertDocxPreview(blob);
      },
      error: (err: Error) => {
        this.fileActionKey.set(null);
        this.toast.show(err.message || 'Could not open the document.', 'error');
      },
    });
  }

  // .docx has no native browser renderer, but it's a zipped XML format we
  // can convert to HTML entirely client-side with mammoth - no server
  // changes or public URL needed, unlike Office/Google's online viewers.
  private convertDocxPreview(blob: Blob): void {
    this.docxConverting.set(true);
    blob
      .arrayBuffer()
      .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
      .then((result) => {
        this.docxConverting.set(false);
        this.docxHtml.set(this.sanitizer.bypassSecurityTrustHtml(result.value));
      })
      .catch(() => {
        this.docxConverting.set(false);
        this.docxError.set(true);
      });
  }

  downloadFile(
    relativeUrl: string | null | undefined,
    fileName: string,
    key: string,
  ): void {
    if (!relativeUrl) return;
    this.fileActionKey.set(key);
    this.prescreening.downloadFile(relativeUrl, fileName).subscribe({
      next: () => this.fileActionKey.set(null),
      error: (err: Error) => {
        this.fileActionKey.set(null);
        this.toast.show(
          err.message || 'Could not download the document.',
          'error',
        );
      },
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
    return new Date(d).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onPsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const error = validatePrescreeningFile(file);
    if (error) {
      this.toast.show(error, 'error');
      return;
    }

    this.uploadingPs.set(true);
    this.prescreening.uploadTemplate(file).subscribe({
      next: (t) => {
        this.psTemplate.set(t);
        this.uploadingPs.set(false);
        this.toast.show('Pre-screening template uploaded.', 'success');
      },
      error: (err: Error) => {
        this.uploadingPs.set(false);
        this.toast.show(err.message, 'error');
      },
    });
  }

  saveOlTemplate(): void {
    if (!this.olTemplateDraft.trim()) return;
    this.savingOl.set(true);
    this.offerLetter.uploadTemplate(this.olTemplateDraft).subscribe({
      next: (t) => {
        this.olTemplate.set(t);
        this.savingOl.set(false);
        this.toast.show('Offer letter template saved.', 'success');
      },
      error: (err: Error) => {
        this.savingOl.set(false);
        this.toast.show(err.message, 'error');
      },
    });
  }
}
