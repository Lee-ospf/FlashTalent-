import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  EmployeeProjectService,
  EmployeeProjectResponse,
  EmployeeProjectSkill,
} from '../../../core/services/employee-project.service';
import {
  EmployeeProfileService,
  EmployeeProfileResponse,
  PROFICIENCY_LEVELS,
} from '../../../core/services/employee-profile.service';

type LineStatus = 'Met' | 'BelowLevel' | 'Missing' | 'Unknown';

interface SkillLine {
  skill: EmployeeProjectSkill;
  status: LineStatus;
  held: string | null;
}

interface Card {
  p: EmployeeProjectResponse;
  active: boolean;
  lines: SkillLine[]; // every project skill, with how the employee compares
  toBuild: SkillLine[]; // required skills the employee doesn't meet yet
  used: SkillLine[]; // skills the employee holds (shown for closed projects)
  avatars: { initials: string; name: string }[];
  extra: number;
}

const MAX_AVATARS = 5;

// Route: my-projects (Employee). Read-only.
// Compares each project's skills with the employee's own profile in the browser, so nothing about
// other people is needed. Needs the endpoint GET api/employees/me/projects (backend change request, BE-3).
@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  template: `
    <div class="page-container mp-page">
      <div class="mp-title">My projects</div>
      <div class="mp-sub">Projects you’ve been added to, and how your skills line up with what each one needs.</div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (error()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ error() }}</div>
      } @else if (!cards().length) {
        <div class="mp-empty">You haven’t been added to a project yet. When HR adds you, it will show up here.</div>
      } @else {
        @for (c of cards(); track c.p.projectId) {
          <div class="mp-card">
            <div class="mp-head">
              <div class="mp-name">{{ c.p.name }}</div>
              <span class="mp-badge" [class.mp-active]="c.active" [class.mp-closed]="!c.active">{{ c.active ? 'Active' : 'Closed' }}</span>
            </div>

            <div class="mp-meta">
              @if (c.p.startDate) {
                <span><i class="ti ti-calendar"></i> Started {{ monthYear(c.p.startDate) }}</span>
              }
              <span><i class="ti ti-users"></i> Team size: {{ c.p.memberCount }} {{ c.p.memberCount === 1 ? 'member' : 'members' }}</span>
              @if (c.p.departmentName) {
                <span><i class="ti ti-building"></i> {{ c.p.departmentName }}</span>
              }
            </div>

            <div class="mp-h">Project description</div>
            <div class="mp-text">{{ c.p.description }}</div>

            <div class="mp-cols">
              <div class="mp-col">
                @if (c.active) {
                  <div class="mp-h">Required skills</div>
                  <ul class="mp-list">
                    @for (l of c.lines; track l.skill.skillId) {
                      <li class="mp-line">
                        <i [class]="'ti ' + icon(l) + ' ' + tone(l)"></i>
                        <span>{{ label(l) }}</span>
                      </li>
                    }
                  </ul>
                } @else {
                  <div class="mp-h">Skills you used</div>
                  @if (c.used.length) {
                    <div class="mp-chips">
                      @for (l of c.used; track l.skill.skillId) {
                        <span class="mp-chip">{{ l.skill.skillName }}</span>
                      }
                    </div>
                  } @else {
                    <div class="mp-muted">None of this project’s skills are on your profile.</div>
                  }
                }
              </div>

              @if (c.active && known()) {
                <div class="mp-col mp-panel">
                  <div class="mp-h">Skills to build</div>
                  @if (c.toBuild.length) {
                    <ul class="mp-list">
                      @for (l of c.toBuild; track l.skill.skillId) {
                        <li class="mp-line"><i class="ti ti-alert-circle mp-warn"></i><span>{{ label(l) }}</span></li>
                      }
                    </ul>
                    <button class="btn-primary mp-btn" type="button" [routerLink]="'/my-profile'" [queryParams]="{ section: 'skills' }">
                      Update my skills
                    </button>
                  } @else {
                    <div class="mp-line"><i class="ti ti-circle-check mp-ok"></i><span>You meet every required skill for this project.</span></div>
                  }
                </div>
              }
            </div>

            @if (c.avatars.length) {
              <div class="mp-h">Team members</div>
              <div class="mp-team">
                @for (a of c.avatars; track a.name) {
                  <span class="mp-avatar" [title]="a.name">{{ a.initials }}</span>
                }
                @if (c.extra > 0) {
                  <span class="mp-avatar mp-more" [attr.aria-label]="c.extra + ' more team members'">+{{ c.extra }}</span>
                }
              </div>
            }
          </div>
        }
      }
    </div>

    <style>
      .mp-page { max-width: 900px; }
      .mp-title { font-size: 26px; font-weight: 800; color: var(--text); }
      .mp-sub { font-size: 14px; color: var(--text-muted); margin: 2px 0 20px; }
      .mp-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 22px 26px; margin-bottom: 16px; }
      .mp-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .mp-name { font-size: 18px; font-weight: 800; color: var(--text); }
      .mp-badge { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
      .mp-active { background: #e8f5e9; color: #1a5c35; }
      .mp-closed { background: var(--surface-2); color: var(--text-muted); }
      .mp-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; color: var(--text-muted); margin: 6px 0 14px; }
      .mp-meta i { margin-right: 4px; }
      .mp-h { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin: 14px 0 6px; }
      .mp-text { font-size: 13.5px; color: var(--text); white-space: pre-line; }
      .mp-cols { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start; }
      .mp-col { flex: 1 1 260px; min-width: 0; }
      .mp-panel { background: #eef6f0; border-radius: 12px; padding: 4px 16px 16px; }
      .mp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
      .mp-line { display: flex; gap: 8px; align-items: flex-start; font-size: 13.5px; color: var(--text); }
      .mp-line i { margin-top: 2px; }
      .mp-ok { color: #1a5c35; }
      .mp-warn { color: #8a5a00; }
      .mp-none { color: var(--text-muted); }
      .mp-chips { display: flex; gap: 6px; flex-wrap: wrap; }
      .mp-chip { font-size: 12px; padding: 4px 10px; border-radius: 20px; background: var(--surface-2); color: var(--text); }
      .mp-muted { font-size: 13px; color: var(--text-muted); }
      .mp-btn { margin-top: 12px; }
      .mp-team { display: flex; gap: 6px; flex-wrap: wrap; }
      .mp-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--navy); color: #fff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
      .mp-more { background: var(--surface-2); color: var(--text-muted); }
      .mp-empty { background: #fff; border: 1px dashed var(--border); border-radius: 16px; padding: 28px; font-size: 14px; color: var(--text-muted); }
      @media (max-width: 560px) { .mp-card { padding: 18px 16px; } }
    </style>
  `,
})
export class MyProjectsComponent implements OnInit {
  private projectApi = inject(EmployeeProjectService);
  private profileApi = inject(EmployeeProfileService);

  projects = signal<EmployeeProjectResponse[]>([]);
  profile = signal<EmployeeProfileResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // If the profile can't be read, skill comparisons are hidden rather than shown wrongly.
  known = computed(() => this.profile() !== null);

  cards = computed<Card[]>(() => {
    const mine = new Map((this.profile()?.skills ?? []).map((s) => [s.skillId, s.proficiencyLevel]));
    const known = this.known();

    return [...this.projects()]
      .sort((a, b) => Number(this.isActive(b)) - Number(this.isActive(a)) || b.addedAt.localeCompare(a.addedAt))
      .map((p) => {
        const lines: SkillLine[] = [...p.skills]
          .sort((a, b) => Number(b.isRequired) - Number(a.isRequired) || a.skillName.localeCompare(b.skillName))
          .map((skill) => {
            const held = mine.get(skill.skillId) ?? null;
            let status: LineStatus = 'Unknown';
            if (known) {
              status = !held ? 'Missing' : this.rank(held) >= this.rank(skill.minimumLevel) ? 'Met' : 'BelowLevel';
            }
            return { skill, status, held };
          });

        const members = p.teamMembers ?? [];
        return {
          p,
          active: this.isActive(p),
          lines,
          toBuild: lines.filter((l) => l.skill.isRequired && (l.status === 'Missing' || l.status === 'BelowLevel')),
          used: lines.filter((l) => l.held !== null),
          avatars: members.slice(0, MAX_AVATARS).map((m) => ({ initials: this.initials(m.fullName), name: m.fullName })),
          extra: Math.max(0, p.memberCount - Math.min(members.length, MAX_AVATARS)),
        };
      });
  });

  ngOnInit(): void {
    forkJoin({
      projects: this.projectApi.getMine(),
      profile: this.profileApi.getMine().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ projects, profile }) => {
        this.projects.set(projects);
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (err) => {
        // 404 or 403 here usually means the backend endpoint isn't available yet.
        this.error.set(
          err?.status === 404 || err?.status === 403
            ? 'My projects isn’t available yet. Please check back soon.'
            : (err?.error?.message ?? 'Could not load your projects.'),
        );
        this.loading.set(false);
      },
    });
  }

  private isActive(p: EmployeeProjectResponse): boolean {
    return p.status === 'Active' || (p.status as unknown) === 0;
  }

  // Levels may arrive as text or numbers depending on the API's JSON settings.
  private rank(level: string | number | null | undefined): number {
    const text = typeof level === 'number' ? PROFICIENCY_LEVELS[level] : level;
    return PROFICIENCY_LEVELS.indexOf(text ?? '');
  }

  private levelText(level: string | number): string {
    return typeof level === 'number' ? (PROFICIENCY_LEVELS[level] ?? String(level)) : level;
  }

  label(l: SkillLine): string {
    const name = l.skill.skillName;
    const optional = l.skill.isRequired ? '' : ' (optional)';
    switch (l.status) {
      case 'Met':
        return `${name}${optional}`;
      case 'BelowLevel':
        return `${name} · ${l.held}, needs ${this.levelText(l.skill.minimumLevel)}${optional}`;
      case 'Missing':
        return `${name} · Missing${optional}`;
      default:
        return `${name} · ${this.levelText(l.skill.minimumLevel)}${optional}`;
    }
  }

  // A missing nice-to-have skill is not a problem, so it gets a neutral icon instead of a warning.
  private neutral(l: SkillLine): boolean {
    return l.status === 'Unknown' || (!l.skill.isRequired && l.status !== 'Met');
  }

  icon(l: SkillLine): string {
    return l.status === 'Met' ? 'ti-circle-check' : this.neutral(l) ? 'ti-circle' : 'ti-alert-circle';
  }

  tone(l: SkillLine): string {
    return l.status === 'Met' ? 'mp-ok' : this.neutral(l) ? 'mp-none' : 'mp-warn';
  }

  initials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
  }

  monthYear(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
  }
}