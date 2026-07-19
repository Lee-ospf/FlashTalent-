import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { DashboardComponent } from './dashboard.component';
import { StaffDashboardComponent } from './staff-dashboard.component';

@Component({
  selector: 'app-dashboard-gate',
  standalone: true,
  imports: [DashboardComponent, StaffDashboardComponent],
  template: `
    @if (isStaff()) {
      <app-staff-dashboard />
    } @else {
      <app-dashboard />
    }
  `
})
export class DashboardGateComponent {
  private auth = inject(AuthService);

  isStaff(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'Recruiter' || role === 'Admin';
  }
}