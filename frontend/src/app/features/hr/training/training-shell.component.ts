import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TrainingService } from '../../../core/services/training.service';

// Routes: admin/training (programmes), /intakes, /review, /resolve, /overdue  (HR, Admin)
// Holds the page title and the sub-tabs. The counts come from TrainingService.badges, so any
// child page can call training.refreshBadges() after an action to update them.
@Component({
  selector: 'app-training-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="page-container ts-page">
      <div class="ts-title">Training</div>
      <div class="ts-sub">
        Manage the catalogue, run intakes and review submissions.
      </div>

      <nav class="ts-tabs" aria-label="Training sections">
        <a
          class="ts-tab"
          routerLink="/admin/training"
          routerLinkActive="ts-on"
          [routerLinkActiveOptions]="{ exact: true }"
          >Programmes</a
        >
        <a class="ts-tab" routerLink="/admin/training/intakes" routerLinkActive="ts-on"
          >Intakes</a
        >
        <a class="ts-tab" routerLink="/admin/training/review" routerLinkActive="ts-on"
          >Review
          @if (badges().review > 0) {
            <span class="ts-pill">{{ badges().review }}</span>
          }
        </a>
        <a class="ts-tab" routerLink="/admin/training/resolve" routerLinkActive="ts-on"
          >Needs resolution
          @if (badges().resolve > 0) {
            <span class="ts-pill">{{ badges().resolve }}</span>
          }
        </a>
        <a class="ts-tab" routerLink="/admin/training/overdue" routerLinkActive="ts-on"
          >Overdue
          @if (badges().overdue > 0) {
            <span class="ts-pill">{{ badges().overdue }}</span>
          }
        </a>
      </nav>

      <router-outlet></router-outlet>
    </div>

    <style>
      .ts-page {
        max-width: 1100px;
      }
      .ts-title {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
      }
      .ts-sub {
        font-size: 14px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .ts-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--border);
        margin: 18px 0 20px;
      }
      .ts-tab {
        padding: 10px 12px;
        margin-bottom: -1px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-muted);
        text-decoration: none;
        border-bottom: 2px solid transparent;
      }
      .ts-tab:hover {
        color: var(--navy);
      }
      .ts-tab:focus-visible {
        outline: 2px solid var(--navy);
        outline-offset: 1px;
      }
      .ts-on {
        color: var(--navy);
        border-bottom-color: var(--navy);
      }
      .ts-pill {
        display: inline-block;
        min-width: 18px;
        padding: 0 6px;
        margin-left: 6px;
        border-radius: 10px;
        background: var(--red, #c62828);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        text-align: center;
      }
    </style>
  `,
})
export class TrainingShellComponent implements OnInit, OnDestroy {
  private training = inject(TrainingService);
  private router = inject(Router);
  private navSub?: Subscription;

  badges = this.training.badges;

  ngOnInit(): void {
    this.training.refreshBadges();
    // Counts can change on another page, so refresh whenever the user moves between tabs.
    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.training.refreshBadges());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }
}