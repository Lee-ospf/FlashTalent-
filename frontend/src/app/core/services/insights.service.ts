import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ───────────────────────── Models (match the backend DTOs) ─────────────────────────

export type InsightSkillCategory = 'Technical' | 'SoftSkill';
export type InsightLevel = 'Beginner' | 'Intermediate' | 'Expert';

// GET api/insights/skills/summary. Used here for the skill picker (every skill, with its people count).
export interface InsightSkillSummaryItem {
  skillId: number;
  skillName: string;
  category: InsightSkillCategory;
  employeeCount: number;
  beginnerCount: number;
  intermediateCount: number;
  expertCount: number;
  coveragePercent: number;
  activeProgrammeCount: number;
}

export interface InsightSkillSummaryResponse {
  generatedAt: string;
  departmentId: number | null;
  activeEmployeeCount: number;
  skills: InsightSkillSummaryItem[];
}

// GET api/insights/skills/rings?skillIds=1,2,3
export interface InsightRingItem {
  skillId: number;
  skillName: string;
  category: InsightSkillCategory;
  total: number; // people with the skill at any level
  beginner: number;
  intermediate: number;
  expert: number;
  noSkill: number;
}

export interface InsightRingsResponse {
  generatedAt: string;
  activeEmployeeCount: number;
  rings: InsightRingItem[];
  departmentFilter: number | null;
}

// GET api/insights/skills/{skillId}/departments
export interface InsightDepartmentCountItem {
  departmentId: number | null; // null = Unassigned
  departmentName: string;
  headcount: number;
  withSkill: number;
}

export interface InsightDepartmentCountsResponse {
  generatedAt: string;
  skillId: number;
  skillName: string;
  totalHeadcount: number;
  totalWithSkill: number;
  departments: InsightDepartmentCountItem[];
}

// GET api/insights/skills/{skillId}/people?level=
export interface InsightPersonItem {
  employeeId: number;
  employeeName: string;
  jobTitle: string | null;
  departmentId: number | null;
  departmentName: string | null;
  level: InsightLevel;
  levelValue: number; // 1 Beginner, 2 Intermediate, 3 Expert
}

export interface InsightPeopleResponse {
  generatedAt: string;
  skillId: number;
  skillName: string;
  levelFilter: number | null;
  count: number;
  people: InsightPersonItem[];
  departmentFilter: number | null;
}

// ───────────────────────── Service ─────────────────────────
//
// Routes (HR, Admin):
//   GET api/insights/skills/summary
//   GET api/insights/skills/rings?skillIds=1,2,3        (1 to 5 skills)
//   GET api/insights/skills/{skillId}/departments
//   GET api/insights/skills/{skillId}/people?level=     (1 to 3, or leave out for any)

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/insights`;

  getSkillSummary(): Observable<InsightSkillSummaryResponse> {
    return this.http.get<InsightSkillSummaryResponse>(`${this.base}/skills/summary`);
  }

  getRings(skillIds: number[], departmentId: number | null = null): Observable<InsightRingsResponse> {
    let params = new HttpParams().set('skillIds', skillIds.join(','));
    if (departmentId !== null) params = params.set('departmentId', departmentId);
    return this.http.get<InsightRingsResponse>(`${this.base}/skills/rings`, { params });
  }

  getDepartmentCounts(skillId: number): Observable<InsightDepartmentCountsResponse> {
    return this.http.get<InsightDepartmentCountsResponse>(`${this.base}/skills/${skillId}/departments`);
  }

   getPeople(
    skillId: number,
    level?: number,
    departmentId: number | null = null,
  ): Observable<InsightPeopleResponse> {
    let params = new HttpParams();
    if (level) params = params.set('level', level);
    if (departmentId !== null) params = params.set('departmentId', departmentId);
    return this.http.get<InsightPeopleResponse>(`${this.base}/skills/${skillId}/people`, { params });
  }
}