import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs';
import { ComplianceService } from '../../../core/services/compliance.service';
import {
  CertificationExpiryItem,
  CertificationExpiryStatus,
  CertificationNoExpiryItem,
  ComplianceSummary,
  EXPIRY_FILTERS,
  ExpiryFilterStatus,
} from './../../../core/models/index';

type Tab = 'expiring' | 'no-expiry';
type CardKey = ExpiryFilterStatus | 'NoExpiry';
type ListResult =
  | { kind: 'expiring'; items: CertificationExpiryItem[] }
  | { kind: 'no-expiry'; items: CertificationNoExpiryItem[] };

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  Expired: { label: 'Expired', cls: 'ct-red' },
  ExpiringIn7: { label: '1 to 7 days', cls: 'ct-orange' },
  ExpiringIn30: { label: '8 to 30 days', cls: 'ct-amber' },
  ExpiringIn90: { label: '31 to 90 days', cls: 'ct-neutral' },
};

// HR page for certification expiry. Read-only for now: lists, filters, search and paging.
// The status filter and the tab live in the URL (?status=ExpiringIn7 or ?tab=no-expiry),
// so the dashboard and the digest notification can link straight into a filtered view.
@Component({
  selector: 'app-certifications',
  standalone: true,
  imports: [DatePipe, MatProgressSpinnerModule],
  template: `
    <div class="page-container ct-page">
      <div class="ct-head">
        <div>
          <div class="ct-title">Certifications</div>
          <div class="ct-sub">
            Track expiring and expired certifications across active employees
          </div>
        </div>
        <div class="ct-search">
          <i class="ti ti-search"></i>
          <input
            type="search"
            placeholder="Search employee or certification"
            aria-label="Search employee or certification"
            (input)="onSearchInput($any($event.target).value)"
          />
        </div>
      </div>

      <div class="ct-stats">
        @for (c of cards(); track c.key) {
          <button
            type="button"
            class="ct-card ct-stat"
            [class.ct-active]="isActive(c.key)"
            [attr.aria-pressed]="isActive(c.key)"
            (click)="onCard(c.key)"
          >
            <span class="ct-k">{{ c.label }}</span>
            <span class="ct-v" [class.ct-v-red]="c.key === 'Expired'">{{
              c.value
            }}</span>
            <span class="ct-statsub">{{ c.sub }}</span>
          </button>
        }
      </div>

      <div class="ct-card ct-listcard">
        <div class="ct-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="ct-tab"
            [class.active]="tab() === 'expiring'"
            [attr.aria-selected]="tab() === 'expiring'"
            (click)="setTab('expiring')"
          >
            Expiring and expired
          </button>
          <button
            type="button"
            role="tab"
            class="ct-tab"
            [class.active]="tab() === 'no-expiry'"
            [attr.aria-selected]="tab() === 'no-expiry'"
            (click)="setTab('no-expiry')"
          >
            No expiry date
          </button>
        </div>

        @if (tab() === 'no-expiry') {
          <div class="ct-note">
            No alerts can be sent for these certifications until an expiry date
            is added to the employee’s profile.
          </div>
        }

        @if (failed()) {
          <div class="api-error">
            <i class="ti ti-alert-circle"></i> We couldn’t load certifications.
            <a class="ct-link" (click)="reload()">Try again</a>
          </div>
        } @else if (loading()) {
          <div class="ct-empty"><mat-spinner diameter="24"></mat-spinner></div>
        } @else if (!rows().length) {
          <div class="ct-empty">{{ emptyText() }}</div>
        } @else {
          <div class="ct-tablewrap">
            @if (tab() === 'expiring') {
              <table class="ct-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Certification</th>
                    <th>Expiry date</th>
                    <th>Time left</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of expiringPage(); track r.employeeQualificationId) {
                    <tr>
                      <td>
                        <div class="ct-main">{{ r.employeeName }}</div>
                        <div class="ct-meta">{{ employeeMeta(r) }}</div>
                      </td>
                      <td>
                        <div class="ct-main">{{ r.certificationName }}</div>
                        <div class="ct-meta">{{ r.institution }}</div>
                      </td>
                      <td class="ct-nowrap">
                        {{ r.expiryDate | date: 'd MMM yyyy' }}
                      </td>
                      <td class="ct-nowrap">{{ daysLabel(r.daysLeft) }}</td>
                      <td>
                        <span
                          class="ct-badge"
                          [class]="'ct-badge ' + badge(r.status).cls"
                          >{{ badge(r.status).label }}</span
                        >
                        @if (r.isPastAlertWindow) {
                          <span
                            class="ct-badge ct-neutral"
                            title="Expired too long ago for the daily job to send an alert"
                            >No alert sent</span
                          >
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <table class="ct-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Certification</th>
                    <th>Obtained on</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of noExpiryPage(); track r.employeeQualificationId) {
                    <tr>
                      <td>
                        <div class="ct-main">{{ r.employeeName }}</div>
                        <div class="ct-meta">{{ employeeMeta(r) }}</div>
                      </td>
                      <td>
                        <div class="ct-main">{{ r.certificationName }}</div>
                        <div class="ct-meta">{{ r.institution }}</div>
                      </td>
                      <td class="ct-nowrap">
                        {{ r.obtainedOn | date: 'd MMM yyyy' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>

          <div class="ct-pager">
            <span class="ct-meta"
              >Showing {{ pageStart() }} to {{ pageEnd() }} of
              {{ rows().length }}</span
            >
            <div class="ct-pagebtns">
              <button
                type="button"
                class="ct-btn"
                [disabled]="page() === 1"
                (click)="page.set(page() - 1)"
              >
                <i class="ti ti-chevron-left"></i> Previous
              </button>
              <button
                type="button"
                class="ct-btn"
                [disabled]="page() >= pageCount()"
                (click)="page.set(page() + 1)"
              >
                Next <i class="ti ti-chevron-right"></i>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .ct-page {
        max-width: 1100px;
      }
      .ct-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }
      .ct-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .ct-sub {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .ct-search {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 0 12px;
        min-width: 280px;
      }
      .ct-search i {
        color: var(--text-muted);
      }
      .ct-search input {
        border: 0;
        outline: 0;
        background: transparent;
        font: inherit;
        font-size: 13px;
        padding: 10px 0;
        flex: 1;
        color: var(--text);
      }
      .ct-search:focus-within {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }

      .ct-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .ct-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px 24px;
      }
      .ct-stat {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        font: inherit;
        cursor: pointer;
        padding: 16px 20px;
      }
      .ct-stat:hover {
        background: var(--surface-2);
      }
      .ct-stat:focus-visible,
      .ct-tab:focus-visible,
      .ct-btn:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .ct-stat.ct-active {
        border-color: var(--navy);
        box-shadow: inset 0 0 0 1px var(--navy);
      }
      .ct-k {
        font-size: 13px;
        color: var(--text-muted);
      }
      .ct-v {
        font-size: 30px;
        font-weight: 800;
        color: var(--text);
        margin-top: 2px;
      }
      .ct-v-red {
        color: #b71c1c;
      }
      .ct-statsub {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }

      .ct-listcard {
        padding: 8px 24px 20px;
      }
      .ct-tabs {
        display: flex;
        gap: 22px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 12px;
      }
      .ct-tab {
        background: none;
        border: 0;
        border-bottom: 3px solid transparent;
        padding: 14px 2px;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-muted);
        cursor: pointer;
      }
      .ct-tab:hover {
        color: var(--navy);
      }
      .ct-tab.active {
        color: var(--navy);
        border-bottom-color: var(--navy);
      }
      .ct-note {
        font-size: 13px;
        color: #8a5a00;
        background: #fff3e0;
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 8px;
      }

      .ct-tablewrap {
        overflow-x: auto;
      }
      .ct-table {
        width: 100%;
        border-collapse: collapse;
      }
      .ct-table th {
        text-align: left;
        font-size: 12.5px;
        font-weight: 700;
        color: var(--text-muted);
        padding: 8px 12px 8px 0;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
      }
      .ct-table td {
        padding: 12px 12px 12px 0;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
        font-size: 14px;
        color: var(--text);
      }
      .ct-table tbody tr:last-child td {
        border-bottom: 0;
      }
      .ct-main {
        font-weight: 700;
      }
      .ct-meta {
        font-size: 12.5px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .ct-nowrap {
        white-space: nowrap;
      }

      .ct-badge {
        display: inline-block;
        font-size: 12px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
        white-space: nowrap;
        margin: 0 6px 4px 0;
      }
      .ct-red {
        background: #fdecea;
        color: #b71c1c;
      }
      .ct-orange {
        background: #ffe3d1;
        color: #9a3d00;
      }
      .ct-amber {
        background: #fff3e0;
        color: #8a5a00;
      }
      .ct-neutral {
        background: var(--surface-2);
        color: var(--text-muted);
      }

      .ct-pager {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding-top: 12px;
      }
      .ct-pagebtns {
        display: flex;
        gap: 8px;
      }
      .ct-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 8px;
        padding: 7px 12px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        color: var(--text);
      }
      .ct-btn:hover:not(:disabled) {
        background: var(--surface-2);
      }
      .ct-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .ct-empty {
        font-size: 13px;
        color: var(--text-muted);
        padding: 16px 0;
      }
      .ct-link {
        font-size: 13px;
        color: var(--navy);
        cursor: pointer;
        text-decoration: underline;
        margin-left: 8px;
      }

      @media (max-width: 560px) {
        .ct-card {
          padding: 16px;
        }
        .ct-listcard {
          padding: 4px 16px 16px;
        }
        .ct-search {
          min-width: 0;
          width: 100%;
        }
      }
    `,
  ],
})
export class CertificationsComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private reload$ = new Subject<void>();
  private searchInput$ = new Subject<string>();

  tab = signal<Tab>('expiring');
  status = signal<ExpiryFilterStatus | null>(null);
  search = signal('');
  page = signal(1);

  loading = signal(true);
  failed = signal(false);
  expiring = signal<CertificationExpiryItem[]>([]);
  noExpiry = signal<CertificationNoExpiryItem[]>([]);

  summary = signal<ComplianceSummary | null>(null); // null = still loading
  summaryFailed = signal(false);

  // The summary cards double as filters
  cards = computed(() => {
    const s = this.summary();
    const v = (n?: number) =>
      this.summaryFailed() ? '—' : s === null ? '…' : String(n ?? 0);
    return [
      {
        key: 'ExpiringIn90' as CardKey,
        label: 'Expiring in 90 days',
        sub: '31 to 90 days left',
        value: v(s?.expiringIn90Days),
      },
      {
        key: 'ExpiringIn30' as CardKey,
        label: 'Expiring in 30 days',
        sub: '8 to 30 days left',
        value: v(s?.expiringIn30Days),
      },
      {
        key: 'ExpiringIn7' as CardKey,
        label: 'Expiring in 7 days',
        sub: '1 to 7 days left',
        value: v(s?.expiringIn7Days),
      },
      {
        key: 'Expired' as CardKey,
        label: 'Expired',
        sub: 'Expiry date today or earlier',
        value: v(s?.expired),
      },
      {
        key: 'NoExpiry' as CardKey,
        label: 'No expiry date',
        sub: 'No alerts can be sent',
        value: v(s?.certificatesWithNoExpiryDate),
      },
    ];
  });

  rows = computed<unknown[]>(() =>
    this.tab() === 'expiring' ? this.expiring() : this.noExpiry(),
  );
  pageCount = computed(() =>
    Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)),
  );
  pageStart = computed(() =>
    this.rows().length === 0 ? 0 : (this.page() - 1) * PAGE_SIZE + 1,
  );
  pageEnd = computed(() =>
    Math.min(this.page() * PAGE_SIZE, this.rows().length),
  );
  expiringPage = computed(() =>
    this.expiring().slice(
      (this.page() - 1) * PAGE_SIZE,
      this.page() * PAGE_SIZE,
    ),
  );
  noExpiryPage = computed(() =>
    this.noExpiry().slice(
      (this.page() - 1) * PAGE_SIZE,
      this.page() * PAGE_SIZE,
    ),
  );

  emptyText = computed(() => {
    if (this.search().trim()) return 'No certifications match your search.';
    if (this.tab() === 'no-expiry')
      return 'Every certification has an expiry date.';
    return this.status()
      ? 'No certifications in this period.'
      : 'No certifications are expiring or expired.';
  });

  ngOnInit(): void {
    // Loads the list for the current tab, status and search. A newer request cancels an older one.
    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          this.failed.set(false);
          const search = this.search().trim() || undefined;

          const request$: Observable<ListResult> =
            this.tab() === 'expiring'
              ? this.compliance
                  .getExpiring(this.status() ?? undefined, search)
                  .pipe(map((items) => ({ kind: 'expiring' as const, items })))
              : this.compliance
                  .getNoExpiry(search)
                  .pipe(
                    map((items) => ({ kind: 'no-expiry' as const, items })),
                  );

          return request$.pipe(
            catchError(() => {
              this.failed.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result.kind === 'expiring') this.expiring.set(result.items);
        else this.noExpiry.set(result.items);
        this.page.set(1);
      });

    this.searchInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.search.set(value);
        this.reload$.next();
      });

    // The URL is the source of truth for tab and status
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const s = params.get('status') as ExpiryFilterStatus | null;
        this.tab.set(
          params.get('tab') === 'no-expiry' ? 'no-expiry' : 'expiring',
        );
        this.status.set(s && EXPIRY_FILTERS.includes(s) ? s : null);
        this.reload$.next();
      });

    this.compliance.getSummary().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summaryFailed.set(true),
    });
  }

  reload(): void {
    this.reload$.next();
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  isActive(key: CardKey): boolean {
    return key === 'NoExpiry'
      ? this.tab() === 'no-expiry'
      : this.tab() === 'expiring' && this.status() === key;
  }

  // Clicking the active card clears the filter
  onCard(key: CardKey): void {
    if (key === 'NoExpiry') {
      this.navigate({
        tab: this.tab() === 'no-expiry' ? null : 'no-expiry',
        status: null,
      });
    } else {
      this.navigate({ tab: null, status: this.isActive(key) ? null : key });
    }
  }

  setTab(tab: Tab): void {
    this.navigate({
      tab: tab === 'no-expiry' ? 'no-expiry' : null,
      status: null,
    });
  }

  private navigate(queryParams: Record<string, string | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  badge(status: CertificationExpiryStatus): { label: string; cls: string } {
    return STATUS_BADGE[status] ?? { label: status, cls: 'ct-neutral' };
  }

  daysLabel(days: number): string {
    if (days === 0) return 'Today';
    if (days > 0) return days === 1 ? 'In 1 day' : `In ${days} days`;
    const ago = -days;
    return ago === 1 ? '1 day ago' : `${ago} days ago`;
  }

  employeeMeta(r: {
    jobTitle: string | null;
    departmentName: string | null;
  }): string {
    return (
      [r.jobTitle, r.departmentName].filter(Boolean).join(' · ') ||
      'No job title'
    );
  }
}
