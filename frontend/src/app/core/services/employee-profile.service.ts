// src/app/core/services/employee-profile.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ───────────────────────── Models (match the backend DTOs) ─────────────────────────

export type QualificationType = 'Education' | 'Certification';
export type CertificationStatus = 'Valid' | 'Expiring' | 'Expired';

// Matches the backend ProficiencyLevel enum exactly (sent and received as strings).
export const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Expert'];

// Same option lists as the candidate personal information form.
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Prefer not to say',
];
export const RACE_OPTIONS = [
  'African',
  'Coloured',
  'Indian/Asian',
  'White',
  'Prefer not to say',
];

export interface EmployeeSkillDto {
  employeeSkillId: number;
  skillId: number;
  skillName: string;
  category: string; // 'Technical' | 'SoftSkill'
  proficiencyLevel: string;
}

export interface EmployeeQualificationDto {
  employeeQualificationId: number;
  qualificationType: QualificationType;
  name: string;
  institution: string; // "Issuing body" for certifications
  yearCompleted: string; // "Issue date" for certifications
  expiryDate?: string | null;
  certificationStatus?: CertificationStatus | null; // computed by the server
}

export interface EmployeeExperienceDto {
  employeeExperienceId: number;
  company: string;
  role: string;
  startDate: string;
  endDate?: string | null;
  projectsAndDuties?: string | null;
}

export interface EmployeeProfileResponse {
  employeeId: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string; // work / login email
  personalEmail?: string | null;
  phone?: string | null;
  gender?: string | null;
  race?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  externalEmployeeId?: string | null;
  employeeNumber?: string | null;
  employmentType?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  jobTitle?: string | null;
  hireDate?: string | null;
  status: string;
  skills: EmployeeSkillDto[];
  qualifications: EmployeeQualificationDto[];
  experiences: EmployeeExperienceDto[];
}

// Shape of GET api/skills (SkillResponse).
export interface SkillOption {
  skillId: number;
  name: string;
  category?: string;
}

export interface AddEmployeeSkillRequest {
  skillId: number;
  proficiencyLevel: string;
}

export interface EmployeeQualificationRequest {
  qualificationType: QualificationType;
  name: string;
  institution: string;
  yearCompleted: string; // yyyy-MM-dd
  expiryDate: string | null; // certifications only
}

export interface EmployeeExperienceRequest {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  projectsAndDuties: string | null;
}

export interface UpdatePersonalDetailsRequest {
  phone: string | null; // SA mobile, no spaces: 0821234567 or +27821234567
  gender: string | null;
  race: string | null;
  nationality: string | null;
  dateOfBirth: string; // yyyy-MM-dd, required, must be 18+
}

// ───────────────────────── Service ─────────────────────────
//
// Routes:
//   GET    api/employees/{id}                       HR read-only (Recruiter, Admin)
//   GET    api/employees/me
//   PUT    api/employees/me/personal                returns the full profile
//   POST   api/employees/me/skills                  PUT/DELETE .../skills/{id}
//   POST   api/employees/me/qualifications          PUT/DELETE .../qualifications/{id}
//   POST   api/employees/me/experience              PUT/DELETE .../experience/{id}   (singular)
//   GET    api/skills                               skills lookup (any signed-in role)

@Injectable({ providedIn: 'root' })
export class EmployeeProfileService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/employees`;
  private me = `${this.base}/me`;

  // Profile
  getMine(): Observable<EmployeeProfileResponse> {
    return this.http.get<EmployeeProfileResponse>(this.me);
  }
  getById(id: number): Observable<EmployeeProfileResponse> {
    return this.http.get<EmployeeProfileResponse>(`${this.base}/${id}`);
  }
  getSkillOptions(): Observable<SkillOption[]> {
    return this.http.get<SkillOption[]>(`${environment.apiUrl}/skills`);
  }
  updatePersonal(
    req: UpdatePersonalDetailsRequest,
  ): Observable<EmployeeProfileResponse> {
    return this.http.put<EmployeeProfileResponse>(`${this.me}/personal`, req);
  }

  // Skills
  addSkill(req: AddEmployeeSkillRequest): Observable<EmployeeSkillDto> {
    return this.http.post<EmployeeSkillDto>(`${this.me}/skills`, req);
  }
  updateSkill(
    id: number,
    proficiencyLevel: string,
  ): Observable<EmployeeSkillDto> {
    return this.http.put<EmployeeSkillDto>(`${this.me}/skills/${id}`, {
      proficiencyLevel,
    });
  }
  deleteSkill(id: number): Observable<void> {
    return this.http.delete<void>(`${this.me}/skills/${id}`);
  }

  // Qualifications and certifications
  addQualification(
    req: EmployeeQualificationRequest,
  ): Observable<EmployeeQualificationDto> {
    return this.http.post<EmployeeQualificationDto>(
      `${this.me}/qualifications`,
      req,
    );
  }
  updateQualification(
    id: number,
    req: EmployeeQualificationRequest,
  ): Observable<EmployeeQualificationDto> {
    return this.http.put<EmployeeQualificationDto>(
      `${this.me}/qualifications/${id}`,
      req,
    );
  }
  deleteQualification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.me}/qualifications/${id}`);
  }

  // Work history (backend route is singular: /experience)
  addExperience(
    req: EmployeeExperienceRequest,
  ): Observable<EmployeeExperienceDto> {
    return this.http.post<EmployeeExperienceDto>(`${this.me}/experience`, req);
  }
  updateExperience(
    id: number,
    req: EmployeeExperienceRequest,
  ): Observable<EmployeeExperienceDto> {
    return this.http.put<EmployeeExperienceDto>(
      `${this.me}/experience/${id}`,
      req,
    );
  }
  deleteExperience(id: number): Observable<void> {
    return this.http.delete<void>(`${this.me}/experience/${id}`);
  }
}
