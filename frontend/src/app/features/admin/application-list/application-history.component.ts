import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationActivityEntry } from '../../../core/models';

@Component({
  selector: 'app-application-history',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container" style="max-width:640px">
      <a (click)="goBack()" class="back-link" style="cursor:pointer">
        <i class="ti ti-arrow-left"></i> Back
      </a>
      <div class="ah-title">Application history</div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!entries().length) {
        <div class="empty-state">
          <i class="ti ti-inbox"></i>
          <p>No activity recorded yet.</p>
        </div>
      } @else {
        <div class="ah-card">
          @for (e of entries(); track $index; let last = $last) {
            <div class="ah-row">
              <div class="ah-rail">
                <div
                  class="ah-dot"
                  [class]="'ah-dot-' + iconClass(e.eventType)"
                >
                  <i class="ti" [class]="iconFor(e.eventType)"></i>
                </div>
                @if (!last) {
                  <div class="ah-line"></div>
                }
              </div>
              <div class="ah-body" [class.ah-body-last]="last">
                <div class="ah-event-title">{{ e.title }}</div>
                @if (e.detail) {
                  <div class="ah-event-detail">{{ e.detail }}</div>
                }
                <div class="ah-event-meta">
                  @if (e.actorName) {
                    by {{ e.actorName }} &middot;
                  }
                  {{ formatDateTime(e.occurredAt) }}
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <style>
      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-muted);
        font-size: 13px;
        margin-bottom: 10px;
      }
      .back-link:hover {
        color: var(--navy);
      }
      .ah-title {
        font-size: 17px;
        font-weight: 800;
        color: var(--text);
        margin-bottom: 16px;
      }
      .ah-card {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px 20px 4px;
      }
      .ah-row {
        display: flex;
        gap: 12px;
      }
      .ah-rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 20px;
        flex-shrink: 0;
      }
      .ah-dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 11px;
      }
      .ah-dot-status {
        background: #e3f2fd;
        color: #0d47a1;
      }
      .ah-dot-prescreen {
        background: #ede7f6;
        color: #4527a0;
      }
      .ah-dot-interview {
        background: #e0f2f1;
        color: #00695c;
      }
      .ah-dot-offer {
        background: #fff3e0;
        color: #e65100;
      }
      .ah-line {
        width: 1px;
        flex: 1;
        background: var(--border);
        margin-top: 4px;
      }
      .ah-body {
        padding-bottom: 18px;
        flex: 1;
        min-width: 0;
      }
      .ah-body-last {
        padding-bottom: 0;
      }
      .ah-event-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .ah-event-detail {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
        font-style: italic;
      }
      .ah-event-meta {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 3px;
      }
    </style>
  `,
})
export class ApplicationHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private appService = inject(ApplicationService);

  loading = signal(true);
  entries = signal<ApplicationActivityEntry[]>([]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.appService.getActivity(id).subscribe({
      next: (e) => {
        this.entries.set(e);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  iconClass(eventType: string): string {
    if (eventType.startsWith('Prescreening')) return 'prescreen';
    if (eventType.startsWith('Interview')) return 'interview';
    if (eventType.startsWith('Offer')) return 'offer';
    return 'status';
  }
  iconFor(eventType: string): string {
    switch (eventType) {
      case 'PrescreeningSent':
        return 'ti-send-2';
      case 'PrescreeningSubmitted':
        return 'ti-file-check';
      case 'PrescreeningOutcome':
        return 'ti-circle-check';
      case 'InterviewScheduled':
        return 'ti-calendar-event';
      case 'InterviewRescheduled':
        return 'ti-calendar-repeat';
      case 'InterviewOutcome':
        return 'ti-circle-check';
      case 'OfferSent':
        return 'ti-mail';
      case 'OfferResponse':
        return 'ti-circle-check';
      default:
        return 'ti-arrow-right';
    }
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
  goBack(): void {
    this.location.back();
  }
}
