import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingService } from '../../../core/services/training.service';
import {
  AssignmentListItem,
  OverdueTrainingItem,
} from '../../../core/models/index';
import { STATUS_META, fmtDate } from '../../../core/utils/training-format';
import { TrainingDueDateDialogComponent } from './training-due-date-dialog.component';

@Component({
  selector: 'app-training-overdue',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="od-note">
      Active employees only. Submissions waiting for HR are in Review, not here.
    </div>

    <div class="od-filters">
      <div class="od-f od-grow">
        <label for="od-q">Search</label>
        <input
          id="od-q"
          class="od-input"
          placeholder="Employee, programme or intake"
          [value]="search()"
          (input)="onSearch($any($event.target).value)"
        />
      </div>
      <div class="od-f">
        <label for="od-p">Programme</label>
        <select
          id="od-p"
          class="od-input"
          (change)="onProgramme($any($event.target).value)"
        >
          <option value="All">All programmes</option>
          @for (p of programmes(); track p) {
            <option [value]="p" [selected]="p === programme()">{{ p }}</option>
          }
        </select>
      </div>
    </div>

    @if (failed()) {
      <div class="api-error">
        <i class="ti ti-alert-circle"></i> We couldn’t load the overdue list.
        <a class="od-link" (click)="load()">Try again</a>
      </div>
    } @else if (items() === null) {
      <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      <div class="od-card">
        <div class="od-scroll">
          <div class="od-table">
            <div class="od-grid od-thead">
              <div>Employee</div>
              <div>Programme</div>
              <div>Status</div>
              <div>Progress</div>
              <div>Due</div>
              <div>Overdue</div>
              <div></div>
            </div>
            @for (a of paged(); track a.trainingAssignmentId) {
              <div class="od-grid od-row">
                <div>
                  <div class="od-name">{{ a.employeeName }}</div>
                  <div class="od-meta">
                    {{ a.jobTitle || '—' }} · {{ a.departmentName || '—' }}
                  </div>
                </div>
                <div>
                  {{ a.programmeTitle }}
                  <div class="od-meta">{{ a.intakeName }}</div>
                </div>
                <div>
                  <span [class]="'tc-chip ' + meta(a).cls">{{
                    meta(a).label
                  }}</span>
                </div>
                <div>{{ a.progressPercent }}%</div>
                <div>{{ fmt(a.dueDate) }}</div>
                <div>
                  <span class="tc-chip tc-red"
                    >{{ a.daysOverdue }} day{{
                      a.daysOverdue === 1 ? '' : 's'
                    }}</span
                  >
                </div>
                <div>
                  <button class="od-btn" type="button" (click)="setDue(a)">
                    Due date
                  </button>
                </div>
              </div>
            } @empty {
              <div class="od-empty">
                @if (items()!.length === 0) {
                  No overdue training.
                } @else {
                  Nothing matches your filters.
                }
              </div>
            }
          </div>
        </div>

        <div class="od-foot">
          <div class="od-meta">
            Showing {{ from() }}–{{ to() }} of {{ filtered().length }}
          </div>
          <nav class="od-pager" aria-label="Pagination">
            <button
              class="od-pg"
              type="button"
              [disabled]="current() === 1"
              (click)="go(current() - 1)"
            >
              Previous
            </button>
            <span class="od-meta"
              >Page {{ current() }} of {{ totalPages() }}</span
            >
            <button
              class="od-pg"
              type="button"
              [disabled]="current() === totalPages()"
              (click)="go(current() + 1)"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    }

    <style>
      .od-note {
        font-size: 13px;
        padding: 10px 14px;
        border-radius: 10px;
        background: var(--surface-2);
        color: var(--text-muted);
        margin-bottom: 14px;
      }
      .od-filters {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: flex-end;
        margin-bottom: 16px;
      }
      .od-f {
        min-width: 170px;
      }
      .od-f label {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .od-grow {
        flex: 1 1 260px;
      }
      .od-input {
        width: 100%;
        box-sizing: border-box;
        padding: 9px 10px;
        font: inherit;
        font-size: 13px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
        min-height: 40px;
      }
      .od-input:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .od-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }
      .od-scroll {
        overflow-x: auto;
      }
      .od-table {
        min-width: 900px;
      }
      .od-grid {
        display: grid;
        grid-template-columns: 2fr 2fr 1.3fr 0.8fr 1fr 1fr 1fr;
        gap: 14px;
        padding: 14px 24px;
        align-items: center;
      }
      .od-thead {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .od-row {
        border-top: 1px solid var(--border);
        font-size: 14px;
      }
      .od-name {
        font-weight: 700;
        color: var(--text);
      }
      .od-meta {
        font-size: 12.5px;
        color: var(--text-muted);
      }
      .od-btn {
        min-height: 40px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 0 14px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        color: var(--text);
      }
      .od-btn:hover {
        background: var(--surface-2);
      }
      .od-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .od-empty {
        padding: 28px;
        text-align: center;
        font-size: 13.5px;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
      }
      .od-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 12px 24px;
        border-top: 1px solid var(--border);
      }
      .od-pager {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .od-pg {
        min-height: 40px;
        padding: 0 14px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .od-pg:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .od-pg:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .od-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
      @media (max-width: 560px) {
        .od-grid,
        .od-foot {
          padding: 12px 16px;
        }
      }
    </style>
  `,
})
export class TrainingOverdueComponent implements OnInit {
  private training = inject(TrainingService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  readonly fmt = fmtDate;
  readonly pageSize = 10;
  meta = (a: OverdueTrainingItem) => STATUS_META[a.status];

  items = signal<OverdueTrainingItem[] | null>(null);
  failed = signal(false);
  search = signal('');
  programme = signal('All');
  page = signal(1);

  programmes = computed(() =>
    Array.from(
      new Set((this.items() ?? []).map((a) => a.programmeTitle)),
    ).sort(),
  );

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const prog = this.programme();
    return (this.items() ?? []).filter((a) => {
      if (prog !== 'All' && a.programmeTitle !== prog) return false;
      return (
        !q ||
        `${a.employeeName} ${a.programmeTitle} ${a.intakeName}`
          .toLowerCase()
          .includes(q)
      );
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );
  current = computed(() => Math.min(this.page(), this.totalPages()));
  paged = computed(() => {
    const start = (this.current() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  from = computed(() =>
    this.filtered().length ? (this.current() - 1) * this.pageSize + 1 : 0,
  );
  to = computed(() =>
    Math.min(this.current() * this.pageSize, this.filtered().length),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(false);
    this.items.set(null);
    this.training.getOverdue().subscribe({
      next: (list) => this.items.set(list),
      error: () => this.failed.set(true),
    });
  }

  onSearch(v: string): void {
    this.search.set(v);
    this.page.set(1);
  }
  onProgramme(v: string): void {
    this.programme.set(v);
    this.page.set(1);
  }
  go(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  // The new due date can't be in the past, so a saved date always clears the overdue state.
  setDue(a: OverdueTrainingItem): void {
    this.dialog
      .open(TrainingDueDateDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        data: {
          assignmentId: a.trainingAssignmentId,
          employeeName: a.employeeName,
          programmeTitle: a.programmeTitle,
          dueDate: a.dueDate,
        },
      })
      .afterClosed()
      .subscribe((updated: AssignmentListItem | undefined) => {
        if (!updated) return;
        this.items.update((list) =>
          (list ?? []).filter(
            (x) => x.trainingAssignmentId !== a.trainingAssignmentId,
          ),
        );
        this.training.refreshBadges();
        this.toast.show('Due date updated. It’s no longer overdue.', 'success');
      });
  }
}
