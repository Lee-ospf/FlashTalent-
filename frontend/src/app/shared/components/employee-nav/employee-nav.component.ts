import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CandidateStateService } from '../../../core/services/candidate-state.service';
import { NotificationService } from '../../../core/services/notification.service';

// Replaces the sidebar + topbar for the Employee role (rendered by AppComponent).
// Tabs: Dashboard (/dashboard) and My profile (/my-profile).
// Bell, unread polling and sign-out mirror TopbarComponent.
@Component({
  selector: 'app-employee-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <header class="en-bar">
      <a class="en-brand" routerLink="/dashboard" aria-label="FlashTalent home">
        <span class="en-logo"><i class="ti ti-bolt"></i></span>
        <span class="en-brand-name">FlashTalent</span>
      </a>

      <nav class="en-tabs" aria-label="Employee navigation">
        <a class="en-tab" routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a class="en-tab" routerLink="/my-profile" routerLinkActive="active">My profile</a>
        <a class="en-tab" routerLink="/my-projects" routerLinkActive="active">Projects</a>
      </nav>

      <button
        mat-icon-button
        class="en-bell"
        routerLink="/notifications"
        matTooltip="Notifications"
        aria-label="Notifications"
      >
        <i class="ti ti-bell" style="font-size:20px"></i>
        @if (unreadCount() > 0) {
          <span class="en-badge">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
        }
      </button>

      <button mat-button class="en-user" [matMenuTriggerFor]="userMenu" aria-label="Account menu">
        <span class="en-avatar">{{ initials() }}</span>
        <span class="en-user-text">
          <span class="en-name">{{ fullName() }}</span>
          <span class="en-role">{{ role() }}</span>
        </span>
        <i class="ti ti-chevron-down en-chev"></i>
      </button>

      <mat-menu #userMenu="matMenu" xPosition="before">
        <div class="en-menu-head">
          <div class="en-menu-name">{{ fullName() }}</div>
          <div class="en-menu-email">{{ email() }}</div>
        </div>
        <button mat-menu-item routerLink="/settings">
          <i class="ti ti-settings" style="margin-right:10px;font-size:16px"></i>
          Settings
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="logout()" style="color:var(--red)">
          <i class="ti ti-logout" style="margin-right:10px;font-size:16px"></i>
          Sign out
        </button>
      </mat-menu>
    </header>
  `,
  styles: [
    `
      :host { display: block; }
      .en-bar {
        position: sticky; top: 0; z-index: 10;
        display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
        background: #fff; border-bottom: 1px solid var(--border);
        padding: 0 32px;
      }
      .en-brand {
        display: flex; align-items: center; gap: 10px;
        text-decoration: none; color: var(--navy); font-weight: 800; font-size: 16px;
      }
      .en-logo {
        width: 32px; height: 32px; border-radius: 9px;
        background: var(--navy); color: #fff;
        display: flex; align-items: center; justify-content: center; font-size: 16px;
      }
      .en-tabs { display: flex; flex: 1; }
      .en-tab {
        padding: 18px 4px; margin-right: 22px;
        font-size: 14px; font-weight: 600; color: var(--text-muted);
        text-decoration: none; border-bottom: 3px solid transparent;
      }
      .en-tab:hover { color: var(--navy); }
      .en-tab.active { color: var(--navy); border-bottom-color: var(--navy); }
      .en-bell { position: relative; }
      .en-badge {
        position: absolute; top: 4px; right: 4px;
        min-width: 16px; height: 16px; padding: 0 4px; border-radius: 10px;
        background: var(--red, #c62828); color: #fff;
        font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
      }
      .en-user { display: flex; align-items: center; height: auto; padding: 6px 10px; border-radius: 8px; }
      .en-avatar {
        width: 34px; height: 34px; border-radius: 50%;
        background: linear-gradient(135deg, #1a2744 0%, #2a3a5c 100%);
        color: #fff; font-size: 12px; font-weight: 700;
        display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .en-user-text { display: inline-flex; flex-direction: column; text-align: left; margin-left: 8px; line-height: 1.3; }
      .en-name { font-size: 13px; font-weight: 700; }
      .en-role { font-size: 12px; color: var(--text-muted); }
      .en-chev { font-size: 14px; color: var(--text-muted); margin-left: 4px; }
      .en-menu-head { padding: 12px 16px 8px; border-bottom: 1px solid var(--border); }
      .en-menu-name { font-size: 13px; font-weight: 600; }
      .en-menu-email { font-size: 11px; color: var(--text-muted); }

      @media (max-width: 700px) {
        .en-bar { gap: 8px; padding: 0 12px; }
        .en-brand { margin-right: auto; padding: 8px 0; }
        .en-brand-name, .en-user-text, .en-chev { display: none; }
        .en-tabs { order: 3; flex-basis: 100%; }
        .en-tab { padding: 12px 4px; }
      }
    `,
  ],
})
export class EmployeeNavComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private state = inject(CandidateStateService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  unreadCount = signal(0);
  private pollHandle?: ReturnType<typeof setInterval>;
  private navSub?: Subscription;

  ngOnInit(): void {
    this.refreshUnreadCount();
    this.pollHandle = setInterval(() => this.refreshUnreadCount(), 3_000);
    // Refresh the badge after navigation, e.g. after reading notifications.
    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.refreshUnreadCount());
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.navSub?.unsubscribe();
  }

  private refreshUnreadCount(): void {
    if (!this.auth.isLoggedIn()) return;
    this.notificationService.getUnreadCount().subscribe({
      next: (r) => this.unreadCount.set(r.unreadCount),
      error: () => {}, // non-critical
    });
  }

  fullName = () => {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : '';
  };
  initials = () => {
    const u = this.auth.currentUser();
    return u ? ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() : '';
  };
  email = () => this.auth.currentUser()?.email ?? '';
  role = () => this.auth.currentUser()?.role ?? '';

  logout(): void {
    this.auth.logout();
    this.state.clear();
    this.router.navigate(['/login']);
  }
}