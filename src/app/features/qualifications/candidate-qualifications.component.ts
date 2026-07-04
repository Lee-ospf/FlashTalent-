import { Component, inject, signal, OnInit } from '@angular/core';
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
import { ToastService } from '../../core/services/toast.service';
import { QualificationResponse } from '../../core/models';

@Component({
  selector: 'app-candidate-qualifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-school"></i> Qualifications</h2>
          <p class="page-sub">Education and certifications, visible to recruiters</p>
        </div>
      </div>

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
            <button mat-raised-button color="primary" type="submit" style="border-radius:8px" [disabled]="form.invalid || saving()">
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
        </div>
        <div class="doc-actions">
          <button class="btn-remove" (click)="remove(q)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    }
  </div>
}
  `
})
export class CandidateQualificationsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(CandidateStateService);
  private qualService = inject(CandidateQualificationService);
  private toast = inject(ToastService);

  qualifications = signal<QualificationResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';
  maxDate = new Date().toISOString().substring(0, 10);

form = this.fb.group({
  qualificationType: ['Education', Validators.required],
  name: ['', Validators.required],
  institution: ['', Validators.required],
  yearCompleted: ['', Validators.required]
});

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
      formatYear(d: string): string {
    return new Date(d).getFullYear().toString();
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    const p = this.state.profile();
    if (!p) return;
    this.loading.set(true);
    this.qualService.getAll(p.candidateId).subscribe({
      next: q => { this.qualifications.set(q); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  add(): void {
  const p = this.state.profile();
  if (!p || this.form.invalid) return;
  this.apiError = '';
  this.saving.set(true);
  const v = this.form.value;
  this.qualService.create(p.candidateId, {
    qualificationType: v.qualificationType as any,
    name: v.name!,
    institution: v.institution!,
    yearCompleted: new Date(v.yearCompleted!).toISOString()
  }).subscribe({
    next: created => {
      this.qualifications.update(list => [created, ...list]);
      this.saving.set(false);
      this.form.reset({ qualificationType: 'Education', name: '', institution: '', yearCompleted: '' });
      this.toast.show('Qualification added.', 'success');
    },
    error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
  });
}

  remove(q: QualificationResponse): void {
    const p = this.state.profile();
    if (!p) return;
    if (!confirm(`Remove "${q.name}"?`)) return;
    this.qualService.delete(p.candidateId, q.candidateQualificationId).subscribe({
      next: () => {
        this.qualifications.update(list => list.filter(x => x.candidateQualificationId !== q.candidateQualificationId));
        this.toast.show('Qualification removed.', 'success');
      },
      error: (err: Error) => this.toast.show(err.message, 'error')
    });
  }
}