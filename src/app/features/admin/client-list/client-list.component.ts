import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClientService } from '../../../core/services/client.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClientResponse } from '../../../core/models';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-building-bank"></i> Manage clients</h2>
          <p class="page-sub">Clients used for external vacancy placements</p>
        </div>
      </div>

      <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label"><i class="ti ti-plus"></i> Add a client</div>
          <form [formGroup]="form" (ngSubmit)="add()">
            <div class="field-grid">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Client name</mat-label>
                <input matInput formControlName="clientName" placeholder="e.g. Acme Corp">
                @if (invalid('clientName')) { <mat-error>Required</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Contact person</mat-label>
                <input matInput formControlName="contactPerson">
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Contact email</mat-label>
                <input matInput type="email" formControlName="contactEmail">
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Contact phone</mat-label>
                <input matInput formControlName="contactPhone">
              </mat-form-field>
            </div>
            <button mat-raised-button color="primary" type="submit" style="border-radius:8px" [disabled]="form.invalid || saving()">
              @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
              <i class="ti ti-plus"></i> Add client
            </button>
          </form>
          @if (apiError) {
            <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
          }
        </mat-card-content>
      </mat-card>

      <div class="card-header"><i class="ti ti-list"></i> Existing clients ({{ clients().length }})</div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!clients().length) {
        <div class="empty-state"><i class="ti ti-building-bank"></i><p>No clients added yet.</p></div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (c of clients(); track c.clientId) {
            <div class="doc-slot">
              <div class="doc-info">
                <div class="doc-name">{{ c.clientName }}</div>
                <div class="doc-meta">{{ c.contactPerson || '—' }} · {{ c.contactEmail || '—' }} · {{ c.contactPhone || '—' }}</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class ClientListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private toast = inject(ToastService);

  clients = signal<ClientResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';

  form = this.fb.group({
    clientName: ['', Validators.required],
    contactPerson: [''],
    contactEmail: ['', Validators.email],
    contactPhone: ['']
  });

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.clientService.getAll().subscribe({
      next: c => { this.clients.set(c); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.apiError = '';
    this.saving.set(true);
    this.clientService.create(this.form.value as any).subscribe({
      next: created => {
        this.clients.update(list => [...list, created]);
        this.saving.set(false);
        this.form.reset();
        this.toast.show(`"${created.clientName}" added.`, 'success');
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
    });
  }
}