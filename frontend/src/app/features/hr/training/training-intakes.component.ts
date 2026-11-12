
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TrainingService } from '../../../core/services/training.service';
import { IntakeListItem } from '../../../core/models/index';
import { STATE_META, fmtDate } from '../../../core/utils/training-format';
 
// Route: admin/training/intakes (second tab of the training shell)
// GET api/training-intakes has no paging, so it loads once and is filtered and paged in the browser.
@Component({
  selector: 'app-training-intakes',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="ti-note">
      Every run of every programme. Open one to assign people and follow their progress. To create an intake, open its programme.
    </div>
 
    <div class="ti-filters">
      <div class="ti-f ti-grow">
        <label for="ti-q">Search</label>
        <input id="ti-q" class="ti-input" placeholder="Intake or programme name" [value]="search()" (input)="onSearch($any($event.target).value)" />
      </div>
      <div class="ti-f">
        <label for="ti-p">Programme</label>
        <select id="ti-p" class="ti-input" (change)="onProgramme($any($event.target).value)">
          <option value="All">All programmes</option>
          @for (p of programmes(); track p) { <option [value]="p" [selected]="p === programme()">{{ p }}</option> }
        </select>
      </div>
      <div class="ti-f">
        <label for="ti-s">State</label>
        <select id="ti-s" class="ti-input" (change)="onState($any($event.target).value)">
          @for (s of states; track s) { <option [value]="s" [selected]="s === state()">{{ s }}</option> }
        </select>
      </div>
    </div>
 
    @if (failed()) {
      <div class="api-error">
        <i class="ti ti-alert-circle"></i> We couldn’t load the intakes.
        <a class="ti-link" (click)="load()">Try again</a>
      </div>
    } @else if (intakes() === null) {
      <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
    } @else {
      <div class="ti-card">
        <div class="ti-scroll">
          <div class="ti-table">
            <div class="ti-grid ti-thead">
              <div>Intake</div>
              <div>Programme</div>
              <div>Dates</div>
              <div>State</div>
              <div>Assigned</div>
              <div>Completed</div>
            </div>
            @for (i of paged(); track i.trainingIntakeId) {
              <a class="ti-grid ti-row" [routerLink]="['/admin/training/intakes', i.trainingIntakeId]">
                <div class="ti-name">{{ i.name }}</div>
                <div>{{ i.programmeTitle }}</div>
                <div>{{ fmt(i.startDate) }} – {{ fmt(i.endDate) }}</div>
                <div><span [class]="'tc-chip ' + meta(i).cls">{{ meta(i).label }}</span></div>
                <div>{{ i.assignmentCount }}{{ i.maxParticipants ? ' / ' + i.maxParticipants : '' }}</div>
                <div>{{ i.completedCount }}</div>
              </a>
            } @empty {
              <div class="ti-empty">
                @if (intakes()!.length === 0) { No intakes yet. Open a programme to create the first one. } @else { No intakes match your filters. }
              </div>
            }
          </div>
        </div>
 
        <div class="ti-foot">
          <div class="ti-meta">Showing {{ from() }}–{{ to() }} of {{ filtered().length }} intakes</div>
          <div class="ti-pagesize">
            <label for="ti-pp" class="ti-meta">Rows per page</label>
            <select id="ti-pp" class="ti-input ti-narrow" (change)="onPageSize($any($event.target).value)">
              @for (n of sizes; track n) { <option [value]="n" [selected]="n === pageSize()">{{ n }}</option> }
            </select>
          </div>
          <nav class="ti-pager" aria-label="Pagination">
            <button class="ti-pg" type="button" [disabled]="current() === 1" (click)="go(current() - 1)">Previous</button>
            @for (n of pages(); track n) {
              <button class="ti-pg" type="button" [class.ti-on]="n === current()" [attr.aria-current]="n === current() ? 'page' : null" (click)="go(n)">{{ n }}</button>
            }
            <button class="ti-pg" type="button" [disabled]="current() === totalPages()" (click)="go(current() + 1)">Next</button>
          </nav>
        </div>
      </div>
    }
 
    <style>
      .ti-note { font-size: 13px; padding: 10px 14px; border-radius: 10px; background: var(--surface-2); color: var(--text-muted); margin-bottom: 14px; }
      .ti-filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 16px; }
      .ti-f { min-width: 160px; }
      .ti-f label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
      .ti-grow { flex: 1 1 240px; }
      .ti-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; min-height: 40px; }
      .ti-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .ti-narrow { width: 76px; }
      .ti-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
      .ti-scroll { overflow-x: auto; }
      .ti-table { min-width: 800px; }
      .ti-grid { display: grid; grid-template-columns: 1.8fr 1.8fr 2fr 1fr 1fr 1fr; gap: 16px; padding: 14px 24px; align-items: center; }
      .ti-thead { font-size: 12px; font-weight: 700; color: var(--text-muted); }
      .ti-row { border-top: 1px solid var(--border); color: inherit; text-decoration: none; font-size: 14px; cursor: pointer; }
      .ti-row:hover { background: var(--surface-2); }
      .ti-row:focus-visible { outline: 2px solid var(--navy); outline-offset: -2px; }
      .ti-name { font-weight: 700; color: var(--text); }
      .ti-meta { font-size: 12.5px; color: var(--text-muted); }
      .ti-empty { padding: 24px; font-size: 13px; color: var(--text-muted); border-top: 1px solid var(--border); }
      .ti-foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; padding: 12px 24px; border-top: 1px solid var(--border); }
      .ti-pagesize { display: flex; align-items: center; gap: 8px; }
      .ti-pager { display: flex; gap: 6px; flex-wrap: wrap; }
      .ti-pg { min-width: 40px; min-height: 40px; padding: 0 12px; border: 1px solid var(--border); background: #fff; border-radius: 8px; font: inherit; font-size: 13px; cursor: pointer; }
      .ti-pg:hover:not(:disabled) { background: var(--surface-2); }
      .ti-pg:disabled { opacity: 0.5; cursor: default; }
      .ti-on { background: var(--navy); border-color: var(--navy); color: #fff; }
      .ti-on:hover:not(:disabled) { background: var(--navy); }
      .ti-link { font-size: 13px; color: var(--navy); cursor: pointer; text-decoration: underline; margin-left: 8px; }
      @media (max-width: 560px) { .ti-grid, .ti-foot { padding: 12px 16px; } }
    </style>
  `,
})
export class TrainingIntakesComponent implements OnInit {
  private training = inject(TrainingService);
 
  readonly states = ['All', 'Upcoming', 'Running', 'Ended'];
  readonly sizes = [5, 10, 25];
  readonly fmt = fmtDate;
  meta = (i: IntakeListItem) => STATE_META[i.state];
 
  intakes = signal<IntakeListItem[] | null>(null);
  failed = signal(false);
  search = signal('');
  programme = signal('All');
  state = signal('All');
  page = signal(1);
  pageSize = signal(10);
 
  programmes = computed(() =>
    Array.from(new Set((this.intakes() ?? []).map((i) => i.programmeTitle))).sort(),
  );
 
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const prog = this.programme();
    const st = this.state();
    return (this.intakes() ?? []).filter((i) => {
      if (prog !== 'All' && i.programmeTitle !== prog) return false;
      if (st !== 'All' && i.state !== st) return false;
      return !q || `${i.name} ${i.programmeTitle}`.toLowerCase().includes(q);
    });
  });
 
  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  current = computed(() => Math.min(this.page(), this.totalPages()));
  paged = computed(() => {
    const start = (this.current() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  from = computed(() => (this.filtered().length ? (this.current() - 1) * this.pageSize() + 1 : 0));
  to = computed(() => Math.min(this.current() * this.pageSize(), this.filtered().length));
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
    this.intakes.set(null);
    this.training.getIntakes().subscribe({
      next: (list) => this.intakes.set(list),
      error: () => this.failed.set(true),
    });
  }
 
  onSearch(v: string): void { this.search.set(v); this.page.set(1); }
  onProgramme(v: string): void { this.programme.set(v); this.page.set(1); }
  onState(v: string): void { this.state.set(v); this.page.set(1); }
  onPageSize(v: string): void { this.pageSize.set(Number(v)); this.page.set(1); }
  go(p: number): void { this.page.set(Math.min(Math.max(1, p), this.totalPages())); }
}
 

