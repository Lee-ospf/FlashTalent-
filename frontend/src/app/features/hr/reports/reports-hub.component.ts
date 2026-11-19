import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ReportCard {
  title: string;
  description: string;
  icon: string;
  link: string;
}

// The Reports tab. One card per report: add a card here when a new report is built.
@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-container rh-page">
      <div class="rh-title">Reports</div>
      <div class="rh-sub">Decision-making views of your workforce.</div>

      <div class="rh-grid">
        @for (r of reports; track r.link) {
          <a class="rh-card" [routerLink]="r.link">
            <span class="rh-icon"><i class="ti {{ r.icon }}"></i></span>
            <span class="rh-body">
              <span class="rh-name">{{ r.title }}</span>
              <span class="rh-desc">{{ r.description }}</span>
            </span>
            <i class="ti ti-chevron-right rh-go"></i>
          </a>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .rh-page { max-width: 1100px; }
      .rh-title { font-size: 26px; font-weight: 800; color: var(--text); }
      .rh-sub { font-size: 14px; color: var(--text-muted); margin-top: 2px; }
      .rh-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-top: 20px; }
      .rh-card { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 20px 24px; color: inherit; text-decoration: none; cursor: pointer; }
      .rh-card:hover { background: var(--surface-2); }
      .rh-card:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
      .rh-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--surface-2); color: var(--navy); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
      .rh-body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
      .rh-name { font-size: 15px; font-weight: 700; color: var(--text); }
      .rh-desc { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
      .rh-go { color: var(--text-muted); font-size: 18px; }
    `,
  ],
})
export class ReportsHubComponent {
  readonly reports: ReportCard[] = [
    {
      title: 'Skills report',
      description: 'Who has each skill, at what level, and where in the company.',
      icon: 'ti-chart-donut',
      link: '/admin/reports/skills',
    },
  ];
}