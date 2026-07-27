import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { CandidateStateService } from '../../../core/services/candidate-state.service';
import { filter, map } from 'rxjs/operators';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/profile':            'My Profile',
  '/documents':          'Supporting Documents',
  '/vacancies':          'Browse Vacancies',
  '/applications':       'My Applications',
  '/skills':              'My Skills',
  '/experience':          'Experience',
  '/qualifications':      'Qualifications',
  '/admin/vacancies':     'Manage Vacancies',
  '/admin/applications':  'Manage Applications',
  '/admin/skills':        'Manage Skills',
  '/admin/departments':   'Manage Departments',
  '/admin/clients':       'Manage Clients',
  '/admin/recruiters':    'Manage Recruiters',
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule],
  template: `
    <header class="topbar">
      <button mat-icon-button class="topbar-toggle" (click)="toggleSidebar.emit()">
        <i class="ti ti-menu-2" style="font-size:20px"></i>
      </button>

      <span class="topbar-title">{{ pageTitle }}</span>

      <div class="topbar-user">
        <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
          <div class="topbar-avatar">{{ initials() }}</div>
          <div style="text-align:left; margin-left: 8px">
            <div class="user-name">{{ fullName() }}</div>
            <div class="user-role">{{ role() }}</div>
          </div>
          <i class="ti ti-chevron-down" style="font-size:14px;color:var(--text-muted);margin-left:4px"></i>
        </button>

        <mat-menu #userMenu="matMenu" xPosition="before">
          <div style="padding:12px 16px 8px; border-bottom: 1px solid var(--border)">
            <div style="font-size:13px;font-weight:600">{{ fullName() }}</div>
            <div style="font-size:11px;color:var(--text-muted)">{{ email() }}</div>
          </div>
          @if (isCandidate()) {
            <button mat-menu-item routerLink="/profile">
              <i class="ti ti-user" style="margin-right:10px;font-size:16px"></i> My Profile
            </button>
            <button mat-menu-item routerLink="/documents">
              <i class="ti ti-files" style="margin-right:10px;font-size:16px"></i> Documents
            </button>
          }
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()" style="color:var(--red)">
            <i class="ti ti-logout" style="margin-right:10px;font-size:16px"></i> Sign out
          </button>
        </mat-menu>
      </div>
    </header>
  `,
  styles: [`
    .user-menu-btn {
      display: flex; align-items: center;
      height: auto; padding: 6px 10px;
      border-radius: 8px;
    }
    .topbar-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #1A2744 0%, #2a3a5c 100%);
      color: #fff; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
  `]
})
export class TopbarComponent {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  private auth = inject(AuthService);
  private state = inject(CandidateStateService);
  private router = inject(Router);

  pageTitle = 'Dashboard';

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map((e: any) => ROUTE_TITLES[e.urlAfterRedirects] ?? 'FlashTalent')
    ).subscribe(title => this.pageTitle = title);
  }

  fullName = () => { const u = this.auth.currentUser(); return u ? `${u.firstName} ${u.lastName}` : ''; };
  initials = () => { const u = this.auth.currentUser(); return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : ''; };
  email    = () => this.auth.currentUser()?.email ?? '';
  role     = () => this.auth.currentUser()?.role ?? '';

  isCandidate(): boolean {
    return this.auth.currentUser()?.role === 'Candidate';
  }

  logout(): void {
    this.auth.logout();
    this.state.clear();
    this.router.navigate(['/login']);
  }
}