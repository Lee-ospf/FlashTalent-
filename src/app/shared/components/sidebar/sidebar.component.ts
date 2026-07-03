import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { CandidateStateService } from '../../../core/services/candidate-state.service';
import { Router } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatTooltipModule],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">

      <!-- Brand -->
      <a class="sidebar-brand" routerLink="/dashboard">
        <div class="brand-logo">
          <i class="ti ti-bolt"></i>
        </div>
        <div>
          <div class="sidebar-brand-name">FlashTalent</div>
          <div class="sidebar-brand-sub">Recruitment Portal</div>
        </div>
      </a>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <div class="nav-section-title">Main</div>

        @for (item of navItems; track item.route) {
          <a class="nav-link"
             [routerLink]="item.route"
             routerLinkActive="active"
             [matTooltip]="collapsed ? item.label : ''"
             matTooltipPosition="right">
            <i class="ti {{ item.icon }}"></i>
            <span class="nav-label">{{ item.label }}</span>
            @if (item.badge) {
              <span class="nav-badge">{{ item.badge }}</span>
            }
          </a>
        }
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="sidebar-footer-avatar">{{ initials() }}</div>
        <div class="sidebar-footer-user">
          <div class="fu-name">{{ fullName() }}</div>
          <div class="fu-role">Candidate</div>
        </div>
        <button class="sidebar-footer-logout"
                (click)="logout()"
                [matTooltip]="'Sign out'"
                matTooltipPosition="right">
          <i class="ti ti-logout"></i>
        </button>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  private auth = inject(AuthService);
  private state = inject(CandidateStateService);
  private router = inject(Router);

  navItems: NavItem[] = [
    { label: 'Dashboard',        icon: 'ti-layout-dashboard', route: '/dashboard' },
    { label: 'My Profile',       icon: 'ti-user-circle',      route: '/profile' },
    { label: 'Documents',        icon: 'ti-files',             route: '/documents' },
    { label: 'Vacancies',        icon: 'ti-briefcase',         route: '/vacancies' },
    { label: 'My Applications',  icon: 'ti-file-check',        route: '/applications' },
  ];

  fullName = () => {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : '';
  };

  initials = () => {
    const u = this.auth.currentUser();
    return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : '';
  };

  logout(): void {
    this.auth.logout();
    this.state.clear();
    this.router.navigate(['/login']);
  }
}
