import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { DashboardComponent } from './dashboard.component';
import { StaffDashboardComponent } from './staff-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { EmployeeDashboardComponent } from './employee-dashboard.component';

@Component({
  selector: 'app-dashboard-gate',
  standalone: true,
  imports: [
    DashboardComponent,
    StaffDashboardComponent,
    AdminDashboardComponent,
    EmployeeDashboardComponent,
  ],
  template: `
    @if (isAdmin()) {
      <app-admin-dashboard />
    } @else if (isRecruiter()) {
      <app-staff-dashboard />
    } @else if (isEmployee()) {
      <app-employee-dashboard />
    } @else {
      <app-dashboard />
    }
  `,
})
export class DashboardGateComponent {
  private auth = inject(AuthService);

  isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'Admin';
  }

  isRecruiter(): boolean {
    return this.auth.currentUser()?.role === 'Recruiter';
  }

  isEmployee(): boolean {
    return this.auth.currentUser()?.role === 'Employee';
  }
}
