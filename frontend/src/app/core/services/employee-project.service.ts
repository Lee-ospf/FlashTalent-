import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ───────────────────────── Models (proposed contract, see the backend change request, BE-3) ─────────────────────────

export interface EmployeeProjectSkill {
  skillId: number;
  skillName: string;
  isRequired: boolean;
  minimumLevel: string | number; // 'Beginner' | 'Intermediate' | 'Expert'
}

// Only present if the backend team agrees employees may see who else is on their project.
export interface EmployeeProjectMember {
  employeeId: number;
  fullName: string;
}

export interface EmployeeProjectResponse {
  projectId: number;
  name: string;
  description: string;
  status: 'Active' | 'Closed' | number;
  departmentName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  addedAt: string;
  memberCount: number;
  skills: EmployeeProjectSkill[];
  teamMembers?: EmployeeProjectMember[] | null;
}

// ───────────────────────── Service ─────────────────────────
//
// Routes:
//   GET api/employees/me/projects    the projects the signed-in employee is a member of (role Employee)

@Injectable({ providedIn: 'root' })
export class EmployeeProjectService {
  private http = inject(HttpClient);

  getMine(): Observable<EmployeeProjectResponse[]> {
    return this.http.get<EmployeeProjectResponse[]>(`${environment.apiUrl}/employees/me/projects`);
  }
}