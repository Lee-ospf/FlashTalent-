import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  InsightsService,
  InsightSkillSummaryItem,
  InsightRingItem,
  InsightDepartmentCountsResponse,
  InsightPeopleResponse,
} from '../../../core/services/insights.service';

const MAX_SKILLS = 5;
const MAX_CHIPS = 60;
const LEVEL_NAMES = ['Beginner', 'Intermediate', 'Expert'];
const LEVEL_OPACITY = [0.3, 0.6, 1];
const RING_R = 40;
const RING_C = 2 * Math.PI * RING_R;

interface RingSegment {
  level: number; // 1 to 3
  label: string;
  count: number;
  opacity: number;
  dash: string;
  offset: number;
}

interface RingView {
  ring: InsightRingItem;
  segments: RingSegment[];
}

@Component({
  selector: 'app-skills-report',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container sr-page">
      <a class="sr-back" routerLink="/admin/reports">
        <i class="ti ti-arrow-left"></i> Reports
      </a>
      <div class="sr-title">Skills report</div>
      <div class="sr-sub">
        Who has each skill, at what level, and where in the company.
      </div>

      @if (failed()) {
        <div class="api-error">
          <i class="ti ti-alert-circle"></i> We couldn’t load the skills.
          <a class="sr-link" (click)="load()">Try again</a>
        </div>
      } @else if (skills() === null) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <!-- Skill picker -->
        <div class="sr-card">
          <div class="sr-pickhead">
            <div class="sr-h">Pick up to {{ max }} skills</div>
            <div class="sr-meta">{{ selected().length }} of {{ max }} selected</div>
          </div>
                    <div class="sr-dept">
            <label for="sr-dept">Department</label>
            <select
              id="sr-dept"
              class="sr-input sr-select"
              (change)="onDepartment($any($event.target).value)"
            >
              <option value="all" [selected]="departmentId() === null">All departments</option>
              @for (d of departmentOptions(); track d.id) {
                <option [value]="d.id" [selected]="d.id === departmentId()">{{ d.name }}</option>
              }
            </select>
          </div>
          <input
            class="sr-input"
            placeholder="Search skills"
            aria-label="Search skills"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
          />
          @if (limitMessage()) {
            <div class="sr-warn">{{ limitMessage() }}</div>
          }
          <div class="sr-chips">
            @for (s of visibleSkills(); track s.skillId) {
              <button
                type="button"
                class="sr-chip"
                [class.sr-on]="isSelected(s.skillId)"
                [attr.aria-pressed]="isSelected(s.skillId)"
                (click)="toggle(s.skillId)"
              >
                {{ s.skillName }}
              </button>
            } @empty {
              <div class="sr-meta">No skills match your search.</div>
            }
          </div>
          @if (hiddenCount() > 0) {
            <div class="sr-meta">
              Showing {{ maxChips }} skills. Type to narrow down {{ hiddenCount() }} more.
            </div>
          }
        </div>

        @if (error()) {
          <div class="api-error">
            <i class="ti ti-alert-circle"></i> {{ error() }}
          </div>
        }

        <!-- Rings -->
        @if (!selected().length) {
          <div class="sr-card sr-empty">Pick a skill above to see who has it.</div>
        } @else {
        <div class="sr-meta sr-scope">Rings and people list: {{ scopeName() }}.</div>
          <div class="sr-rings">
            @for (v of ringViews(); track v.ring.skillId) {
              <div class="sr-ring">
                <div class="sr-ring-name">{{ v.ring.skillName }}</div>
                <svg
                  viewBox="0 0 110 110"
                  width="110"
                  height="110"
                  role="img"
                  [attr.aria-label]="v.ring.skillName + ': ' + v.ring.total + ' people'"
                >
                  @if (v.ring.total === 0) {
                    <circle cx="55" cy="55" r="40" fill="none" stroke="var(--border)" stroke-width="14" />
                  }
                  @for (s of v.segments; track s.level) {
                    <circle
                      class="sr-seg"
                      cx="55"
                      cy="55"
                      r="40"
                      fill="none"
                      stroke="var(--navy)"
                      stroke-width="14"
                      transform="rotate(-90 55 55)"
                      [attr.stroke-opacity]="s.opacity"
                      [attr.stroke-dasharray]="s.dash"
                      [attr.stroke-dashoffset]="s.offset"
                      (click)="openPeople(v.ring.skillId, s.level)"
                    >
                      <title>{{ v.ring.skillName }}, {{ s.label }}: {{ s.count }}</title>
                    </circle>
                  }
                  <text
                    class="sr-ring-num"
                    x="55"
                    y="61"
                    text-anchor="middle"
                    (click)="openPeople(v.ring.skillId, 0)"
                  >
                    {{ v.ring.total }}
                  </text>
                </svg>
                <div class="sr-meta">
                  B {{ v.ring.beginner }} · I {{ v.ring.intermediate }} · E {{ v.ring.expert }}
                </div>
                <div class="sr-meta">No skill: {{ v.ring.noSkill }}</div>
                <button type="button" class="sr-textbtn" (click)="openPeople(v.ring.skillId, 0)">
                  View people
                </button>
              </div>
            }
          </div>
        }

        <!-- People list -->
        @if (filter()) {
          <div class="sr-card">
            <div class="sr-pickhead">
              <div class="sr-h">
                {{ people()?.skillName }}
                @if (people()) {
                  <span class="sr-count">{{ people()!.count }} people in {{ scopeName() }}</span>
                }
              </div>
              <button
                type="button"
                class="sr-btn"
                [disabled]="!people()?.count"
                (click)="exportCsv()"
              >
                <i class="ti ti-download"></i> Export CSV
              </button>
            </div>

            <div class="sr-levels">
              @for (l of levelOptions; track l.value) {
                <button
                  type="button"
                  class="sr-chip"
                  [class.sr-on]="filter()!.level === l.value"
                  (click)="setLevel(l.value)"
                >
                  {{ l.label }}
                </button>
              }
            </div>

                        @if (peopleLoading()) {
              <div class="sr-empty"><mat-spinner diameter="24"></mat-spinner></div>
            } @else if (people()) {
              <div class="sr-scroll">
                <div class="sr-table">
                  <div class="sr-grid sr-head">
                    <div>Employee</div>
                    <div>Job title</div>
                    <div>Department</div>
                    <div>Level</div>
                  </div>
                  @for (e of people()!.people; track e.employeeId) {
                    <a class="sr-grid sr-row" [routerLink]="['/admin/employees', e.employeeId]">
                      <div class="sr-name">{{ e.employeeName }}</div>
                      <div>{{ e.jobTitle || '—' }}</div>
                      <div>{{ e.departmentName || 'Unassigned' }}</div>
                      <div>
                        <span class="sr-badge sr-lv{{ e.levelValue }}">{{ e.level }}</span>
                      </div>
                    </a>
                  } @empty {
                    <div class="sr-empty">No one has this skill at this level.</div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Department bars (always last) -->
        @if (selectedItems().length) {
          <div class="sr-card">
            <div class="sr-pickhead">
              <div class="sr-h">People with this skill, by department</div>
              <div class="sr-pick">
                <label for="sr-skill">Skill</label>
                <select
                  id="sr-skill"
                  class="sr-input sr-select"
                  (change)="onPickSkill($any($event.target).value)"
                >
                  @for (s of selectedItems(); track s.skillId) {
                    <option [value]="s.skillId" [selected]="s.skillId === pickSkillId()">
                      {{ s.skillName }}
                    </option>
                  }
                </select>
              </div>
            </div>

            @if (departments(); as d) {
              <div class="sr-bars">
                @for (row of d.departments; track row.departmentName) {
                  <div class="sr-bar">
                    <div class="sr-bar-name">{{ row.departmentName }}</div>
                    <div class="sr-track">
                      <div class="sr-fill" [style.width.%]="barWidth(row.withSkill)"></div>
                    </div>
                    <div class="sr-bar-num">
                      <b>{{ row.withSkill }}</b> of {{ row.headcount }}
                    </div>
                  </div>
                }
              </div>
              <div class="sr-meta">
                Bar length is the number of people with the skill, at any level. “of N” is the
                department’s size, so you can compare departments of different sizes.
              </div>
            } @else {
              <div class="sr-empty"><mat-spinner diameter="24"></mat-spinner></div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .sr-page { max-width: 1100px; }
      .sr-back { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-muted); text-decoration: none; margin-bottom: 8px; }
      .sr-back:hover { color: var(--navy); }
      .sr-title { font-size: 26px; font-weight: 800; color: var(--text); }
      .sr-sub { font-size: 14px; color: var(--text-muted); margin: 2px 0 20px; }
      .sr-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 20px 24px; margin-bottom: 16px; }
      .sr-pickhead { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
      .sr-h { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }
      .sr-count { margin-left: 8px; font-size: 12.5px; font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-muted); }
      .sr-meta { font-size: 12.5px; color: var(--text-muted); }
      .sr-warn { font-size: 12.5px; color: #8a5a00; margin-top: 8px; }
      .sr-link { font-size: 13px; color: var(--navy); cursor: pointer; text-decoration: underline; margin-left: 8px; }
      .sr-input { width: 100%; box-sizing: border-box; padding: 9px 10px; font: inherit; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; background: #fff; min-height: 40px; }
      .sr-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; }
      .sr-select { width: auto; min-width: 160px; }
      .sr-pick { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); }
      .sr-chips, .sr-levels { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; max-height: 180px; overflow-y: auto; }
      .sr-levels { max-height: none; margin-top: 0; margin-bottom: 12px; }
      .sr-chip { padding: 6px 14px; border: 1px solid var(--border); background: #fff; border-radius: 999px; font: inherit; font-size: 13px; cursor: pointer; color: var(--text); }
      .sr-chip:hover { background: var(--surface-2); }
      .sr-chip:focus-visible, .sr-btn:focus-visible, .sr-textbtn:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
      .sr-on, .sr-on:hover { background: var(--navy); border-color: var(--navy); color: #fff; }
      .sr-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: 8px 14px; font: inherit; font-size: 13px; cursor: pointer; color: var(--text); }
      .sr-btn:hover:not(:disabled) { background: var(--surface-2); }
      .sr-btn:disabled { opacity: 0.5; cursor: default; }
      .sr-textbtn { border: none; background: none; font: inherit; font-size: 13px; color: var(--navy); text-decoration: underline; cursor: pointer; margin-top: 4px; }

      .sr-rings { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; margin-bottom: 16px; }
      .sr-ring { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 16px; text-align: center; }
      .sr-ring-name { font-size: 14px; font-weight: 700; color: var(--text); }
      .sr-seg { cursor: pointer; }
      .sr-ring-num { font-size: 22px; font-weight: 800; fill: var(--text); cursor: pointer; }

      .sr-scroll { overflow-x: auto; }
      .sr-table { min-width: 560px; }
      .sr-grid { display: grid; grid-template-columns: 2fr 1.6fr 1.2fr 1fr; gap: 16px; padding: 12px 8px; align-items: center; }
      .sr-head { font-size: 12px; font-weight: 700; color: var(--text-muted); }
      .sr-row { border-top: 1px solid var(--border); color: inherit; text-decoration: none; font-size: 14px; cursor: pointer; }
      .sr-row:hover { background: var(--surface-2); }
      .sr-row:focus-visible { outline: 2px solid var(--navy); outline-offset: -2px; }
      .sr-name { font-weight: 700; color: var(--text); }
      .sr-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
      .sr-lv1 { background: #e8edf7; color: var(--navy); }
      .sr-lv2 { background: #c9d4ec; color: var(--navy); }
      .sr-lv3 { background: var(--navy); color: #fff; }
      .sr-empty { font-size: 13px; color: var(--text-muted); padding: 12px 0; text-align: center; }

      .sr-bars { display: flex; flex-direction: column; gap: 10px; margin: 8px 0 12px; }
      .sr-bar { display: flex; align-items: center; gap: 12px; font-size: 13px; }
      .sr-bar-name { width: 120px; flex-shrink: 0; }
      .sr-track { flex: 1; height: 18px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
      .sr-fill { height: 100%; background: var(--navy); }
      .sr-bar-num { width: 90px; text-align: right; color: var(--text-muted); flex-shrink: 0; }
      .sr-bar-num b { color: var(--text); font-weight: 700; }
      .sr-dept { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
      .sr-scope { margin-bottom: 8px; }

      @media (max-width: 560px) {
        .sr-card { padding: 16px; }
        .sr-bar-name { width: 84px; }
      }
    `,
  ],
})
export class SkillsReportComponent implements OnInit {
  private insights = inject(InsightsService);

  readonly max = MAX_SKILLS;
  readonly maxChips = MAX_CHIPS;
  readonly levelOptions = [
    { value: 0, label: 'All levels' },
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Intermediate' },
    { value: 3, label: 'Expert' },
  ];

  skills = signal<InsightSkillSummaryItem[] | null>(null); // null = still loading
  failed = signal(false);
  error = signal<string | null>(null);
  search = signal('');
  limitMessage = signal('');
    // null = all departments, 0 = Unassigned (no department), otherwise a DepartmentId
  departmentId = signal<number | null>(null);
  departmentOptions = signal<{ id: number; name: string }[]>([]);
  scopeName = computed(() => {
    const id = this.departmentId();
    if (id === null) return 'all departments';
    return this.departmentOptions().find((d) => d.id === id)?.name ?? 'this department';
  });

  selected = signal<number[]>([]);
  rings = signal<InsightRingItem[]>([]);

  pickSkillId = signal<number | null>(null);
  departments = signal<InsightDepartmentCountsResponse | null>(null);

  filter = signal<{ skillId: number; level: number } | null>(null);
  people = signal<InsightPeopleResponse | null>(null);
  peopleLoading = signal(false);

  // Ignore answers from requests that were replaced by a newer one
  private ringsReq = 0;
  private deptReq = 0;
  private peopleReq = 0;

  private skillById = computed(
    () => new Map((this.skills() ?? []).map((s) => [s.skillId, s])),
  );

  selectedItems = computed(() =>
    this.selected()
      .map((id) => this.skillById().get(id))
      .filter((s): s is InsightSkillSummaryItem => !!s),
  );

  private matching = computed(() => {
    const q = this.search().trim().toLowerCase();
    return (this.skills() ?? []).filter((s) => !q || s.skillName.toLowerCase().includes(q));
  });
  visibleSkills = computed(() => this.matching().slice(0, MAX_CHIPS));
  hiddenCount = computed(() => Math.max(0, this.matching().length - MAX_CHIPS));

  ringViews = computed<RingView[]>(() =>
    this.rings().map((r) => {
      const counts = [r.beginner, r.intermediate, r.expert];
      let offset = 0;
      const segments = counts
        .map((count, i) => {
          const len = r.total === 0 ? 0 : (RING_C * count) / r.total;
          const seg: RingSegment = {
            level: i + 1,
            label: LEVEL_NAMES[i],
            count,
            opacity: LEVEL_OPACITY[i],
            dash: `${len} ${RING_C - len}`,
            offset: -offset,
          };
          offset += len;
          return seg;
        })
        .filter((s) => s.count > 0);
      return { ring: r, segments };
    }),
  );

  private maxHeadcount = computed(() =>
    Math.max(1, ...(this.departments()?.departments ?? []).map((d) => d.headcount)),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(false);
    this.skills.set(null);
    this.insights.getSkillSummary().subscribe({
      next: (r) => {
        this.skills.set(r.skills);
        // Start with the three most common skills, so the screen isn't empty
        const start = [...r.skills]
          .filter((s) => s.employeeCount > 0)
          .sort((a, b) => b.employeeCount - a.employeeCount)
          .slice(0, 3)
          .map((s) => s.skillId);
        this.selected.set(start);
        this.afterSelectionChange();
              if (!start.length && r.skills.length) {
        this.insights.getDepartmentCounts(r.skills[0].skillId).subscribe({
          next: (d) => this.setDepartmentOptions(d),
        });
      }
      },
      error: () => this.failed.set(true),
    });
  }

  isSelected(id: number): boolean {
    return this.selected().includes(id);
  }

  toggle(id: number): void {
    const current = this.selected();
    if (current.includes(id)) {
      this.selected.set(current.filter((x) => x !== id));
    } else if (current.length >= MAX_SKILLS) {
      this.limitMessage.set(`You can pick up to ${MAX_SKILLS} skills. Remove one first.`);
      return;
    } else {
      this.selected.set([...current, id]);
    }
    this.limitMessage.set('');
    this.afterSelectionChange();
  }

  private afterSelectionChange(): void {
    const sel = this.selected();
    this.loadRings();

    // The department panel follows one of the selected skills
    if (!sel.includes(this.pickSkillId() ?? -1)) {
      this.pickSkillId.set(sel[0] ?? null);
      this.loadDepartments();
    }

    // Close the people list if its skill was removed
    const f = this.filter();
    if (f && !sel.includes(f.skillId)) {
      this.filter.set(null);
      this.people.set(null);
    }
  }

  private loadRings(): void {
    const ids = this.selected();
    const token = ++this.ringsReq;
    if (!ids.length) {
      this.rings.set([]);
      return;
    }
    this.insights.getRings(ids, this.departmentId()).subscribe({
      next: (r) => {
        if (token !== this.ringsReq) return;
        this.error.set(null);
        this.rings.set(r.rings);
      },
      error: (e) => {
        if (token === this.ringsReq) this.error.set(this.message(e));
      },
    });
  }

  onPickSkill(value: string): void {
    this.pickSkillId.set(Number(value));
    this.loadDepartments();
  }
   
    onDepartment(value: string): void {
    this.departmentId.set(value === 'all' ? null : Number(value));
    this.loadRings();
    if (this.filter()) this.loadPeople();   // the open list follows the filter
  }

  // The department list comes from the department chart's data (every department, plus Unassigned)
  private setDepartmentOptions(r: InsightDepartmentCountsResponse): void {
    this.departmentOptions.set(
      r.departments.map((d) => ({ id: d.departmentId ?? 0, name: d.departmentName })),
    );
  }

  private loadDepartments(): void {
    const id = this.pickSkillId();
    const token = ++this.deptReq;
    this.departments.set(null);
    if (id === null) return;
    this.insights.getDepartmentCounts(id).subscribe({
      next: (r) => {
      if (token !== this.deptReq) return;
      this.departments.set(r);
      this.setDepartmentOptions(r);
    },
      error: (e) => {
        if (token === this.deptReq) this.error.set(this.message(e));
      },
    });
  }

  barWidth(withSkill: number): number {
    return (withSkill / this.maxHeadcount()) * 100;
  }

  openPeople(skillId: number, level: number): void {
    this.filter.set({ skillId, level });
    this.loadPeople();
  }

  setLevel(level: number): void {
    const f = this.filter();
    if (!f) return;
    this.filter.set({ ...f, level });
    this.loadPeople();
  }

  private loadPeople(): void {
    const f = this.filter();
    if (!f) return;
    const token = ++this.peopleReq;
    this.peopleLoading.set(true);
    this.insights.getPeople(f.skillId, f.level || undefined, this.departmentId()).subscribe({
      next: (r) => {
        if (token !== this.peopleReq) return;
        this.people.set(r);
        this.peopleLoading.set(false);
      },
      error: (e) => {
        if (token !== this.peopleReq) return;
        this.people.set(null);
        this.peopleLoading.set(false);
        this.error.set(this.message(e));
      },
    });
  }

  // Downloads exactly the rows on screen. The BOM makes Excel read accents correctly.
  exportCsv(): void {
    const r = this.people();
    const f = this.filter();
    if (!r || !f) return;

    // Names and job titles are typed by users: stop a leading = + - @ from running as an Excel formula
    const cell = (v: string | number | null | undefined): string => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };

    const header = ['Name', 'Department', 'Job title', 'Level', 'Level number'];
    const lines = r.people.map((p) =>
      [p.employeeName, p.departmentName ?? 'Unassigned', p.jobTitle ?? '', p.level, p.levelValue]
        .map(cell)
        .join(','),
    );
    const csv = '\uFEFF' + [header.map(cell).join(','), ...lines].join('\r\n');

    const slug = r.skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const levelPart = f.level ? `-${LEVEL_NAMES[f.level - 1].toLowerCase()}` : '';

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
       const dept = this.departmentId() === null
      ? ''
      : '-' + this.scopeName().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.download = `skills-${slug}${levelPart}${dept}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private message(e: unknown): string {
    const msg = e instanceof HttpErrorResponse ? e.error?.message : null;
    return msg ?? 'Something went wrong loading the report. Please try again.';
  }
}