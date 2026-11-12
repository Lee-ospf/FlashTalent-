import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TrainingService } from '../../../core/services/training.service';
import { ProgrammeListItem } from '../../../core/models';

// Route: admin/training (first tab of the training shell)
// GET api/training-programmes has no paging, so it loads once and is filtered and paged in the browser.
@Component({
  selector: 'app-training-programmes',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="tp-bar">
      <div class="tp-filters">
        <div class="tp-f tp-grow">
          <label for="tp-q">Search</label>
          <input
            id="tp-q"
            class="tp-input"
            placeholder="Title or provider"
            [value]="search()"
            (input)="onSearch($any($event.target).value)"
          />
        </div>
        <div class="tp-f">
          <label for="tp-c">Category</label>
          <select
            id="tp-c"
            class="tp-input"
            (change)="onCategory($any($event.target).value)"
          >
            <option value="All">All categories</option>
            @for (c of categories(); track c) {
              <option [value]="c" [selected]="c === category()">{{ c }}</option>
            }
          </select>
        </div>
        <div class="tp-f">
          <label for="tp-s">Status</label>
          <select
            id="tp-s"
            class="tp-input"
            (change)="onStatus($any($event.target).value)"
          >
            @for (s of statuses; track s) {
              <option [value]="s" [selected]="s === status()">{{ s }}</option>
            }
          </select>
        </div>
      </div>
      <button
        class="btn-primary"
        type="button"
        routerLink="/admin/training/programmes/new"
      >
        <i class="ti ti-plus"></i> New programme
      </button>
    </div>

    @if (failed()) {
      <div class="api-error">
        <i class="ti ti-alert-circle"></i> We couldn’t load the programmes.
        <a class="tp-link" (click)="load()">Try again</a>
      </div>
    } @else if (programmes() === null) {
      <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      <div class="tp-card">
        <div class="tp-scroll">
          <div class="tp-table">
            <div class="tp-grid tp-thead">
              <div>Programme</div>
              <div>Category</div>
              <div>Hours</div>
              <div>Skills</div>
              <div>Open intakes</div>
              <div>Status</div>
            </div>
            @for (p of paged(); track p.trainingProgrammeId) {
              <a
                class="tp-grid tp-row"
                [routerLink]="[
                  '/admin/training/programmes',
                  p.trainingProgrammeId,
                ]"
              >
                <div>
                  <div class="tp-name">{{ p.title }}</div>
                  <div class="tp-meta">{{ p.provider || 'No provider' }}</div>
                </div>
                <div>{{ p.category || '—' }}</div>
                <div>{{ p.durationHours ?? '—' }}</div>
                <div>{{ p.skillCount }}</div>
                <div>{{ p.openIntakeCount }}</div>
                <div>
                  <span
                    class="tc-chip"
                    [class]="
                      p.isActive ? 'tc-chip tc-green' : 'tc-chip tc-grey'
                    "
                    >{{ p.isActive ? 'Active' : 'Retired' }}</span
                  >
                </div>
              </a>
            } @empty {
              <div class="tp-empty">
                @if (programmes()!.length === 0) {
                  No programmes yet. Create the first one to start running
                  intakes.
                } @else {
                  No programmes match your filters.
                }
              </div>
            }
          </div>
        </div>

        <div class="tp-foot">
          <div class="tp-meta">
            Showing {{ from() }}–{{ to() }} of
            {{ filtered().length }} programmes
          </div>
          <div class="tp-pagesize">
            <label for="tp-pp" class="tp-meta">Rows per page</label>
            <select
              id="tp-pp"
              class="tp-input tp-narrow"
              (change)="onPageSize($any($event.target).value)"
            >
              @for (n of sizes; track n) {
                <option [value]="n" [selected]="n === pageSize()">
                  {{ n }}
                </option>
              }
            </select>
          </div>
          <nav class="tp-pager" aria-label="Pagination">
            <button
              class="tp-pg"
              type="button"
              [disabled]="current() === 1"
              (click)="go(current() - 1)"
            >
              Previous
            </button>
            @for (n of pages(); track n) {
              <button
                class="tp-pg"
                type="button"
                [class.tp-on]="n === current()"
                [attr.aria-current]="n === current() ? 'page' : null"
                (click)="go(n)"
              >
                {{ n }}
              </button>
            }
            <button
              class="tp-pg"
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
      .tp-bar {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .tp-filters {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: flex-end;
        flex: 1 1 520px;
      }
      .tp-f {
        min-width: 160px;
      }
      .tp-f label {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .tp-grow {
        flex: 1 1 240px;
      }
      .tp-input {
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
      .tp-input:focus {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .tp-narrow {
        width: 76px;
      }
      .tp-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }
      .tp-scroll {
        overflow-x: auto;
      }
      .tp-table {
        min-width: 760px;
      }
      .tp-grid {
        display: grid;
        grid-template-columns: 2.6fr 1.2fr 0.7fr 0.7fr 1fr 0.9fr;
        gap: 16px;
        padding: 14px 24px;
        align-items: center;
      }
      .tp-thead {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .tp-row {
        border-top: 1px solid var(--border);
        color: inherit;
        text-decoration: none;
        font-size: 14px;
        cursor: pointer;
      }
      .tp-row:hover {
        background: var(--surface-2);
      }
      .tp-row:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: -2px;
      }
      .tp-name {
        font-weight: 700;
        color: var(--text);
      }
      .tp-meta {
        font-size: 12.5px;
        color: var(--text-muted);
      }
      .tp-empty {
        padding: 24px;
        font-size: 13px;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
      }
      .tp-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        padding: 12px 24px;
        border-top: 1px solid var(--border);
      }
      .tp-pagesize {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tp-pager {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .tp-pg {
        min-width: 40px;
        min-height: 40px;
        padding: 0 12px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .tp-pg:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .tp-pg:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .tp-on {
        background: var(--navy);
        border-color: var(--navy);
        color: #fff;
      }
      .tp-on:hover:not(:disabled) {
        background: var(--navy);
      }
      .tp-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }
      @media (max-width: 560px) {
        .tp-grid,
        .tp-foot {
          padding: 12px 16px;
        }
      }
    </style>
  `,
})
export class TrainingProgrammesComponent implements OnInit {
  private training = inject(TrainingService);

  readonly statuses = ['Active', 'Retired', 'All'];
  readonly sizes = [5, 10, 25];

  programmes = signal<ProgrammeListItem[] | null>(null);
  failed = signal(false);
  search = signal('');
  category = signal('All');
  status = signal('Active');
  page = signal(1);
  pageSize = signal(10);

  categories = computed(() =>
    Array.from(
      new Set(
        (this.programmes() ?? [])
          .map((p) => p.category)
          .filter((c): c is string => !!c),
      ),
    ).sort(),
  );

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    const st = this.status();
    return (this.programmes() ?? []).filter((p) => {
      if (st === 'Active' && !p.isActive) return false;
      if (st === 'Retired' && p.isActive) return false;
      if (cat !== 'All' && p.category !== cat) return false;
      return !q || `${p.title} ${p.provider ?? ''}`.toLowerCase().includes(q);
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize())),
  );
  current = computed(() => Math.min(this.page(), this.totalPages()));
  paged = computed(() => {
    const start = (this.current() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  from = computed(() =>
    this.filtered().length ? (this.current() - 1) * this.pageSize() + 1 : 0,
  );
  to = computed(() =>
    Math.min(this.current() * this.pageSize(), this.filtered().length),
  );
  pages = computed(() => {
    const t = this.totalPages();
    const start = Math.max(1, Math.min(this.current() - 2, t - 4));
    const end = Math.min(t, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(false);
    this.programmes.set(null);
    this.training.getProgrammes().subscribe({
      next: (list) => this.programmes.set(list),
      error: () => this.failed.set(true),
    });
  }

  onSearch(v: string): void {
    this.search.set(v);
    this.page.set(1);
  }
  onCategory(v: string): void {
    this.category.set(v);
    this.page.set(1);
  }
  onStatus(v: string): void {
    this.status.set(v);
    this.page.set(1);
  }
  onPageSize(v: string): void {
    this.pageSize.set(Number(v));
    this.page.set(1);
  }
  go(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }
}
