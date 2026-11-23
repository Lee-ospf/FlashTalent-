import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdviceResponse, AdviceStatus } from '../models/index';
import { GapAnalysisResult } from './project.service';

// The code-only gap (no AI) for one employee on one project
export interface ProjectGapResponse {
  projectId: number;
  projectName: string;
  employeeId: number;
  gaps: GapAnalysisResult;
}

// HR and Admin: project skill gaps and AI training suggestions for one employee.
//   GET   api/projects/{pid}/employees/{eid}/gaps          code only, no AI
//   GET   api/projects/{pid}/employees/{eid}/suggestions   204 = nothing generated yet
//   POST  api/projects/{pid}/employees/{eid}/suggestions   429 = daily limit, 502 = AI failed
//   PATCH api/skill-advice-items/{id}/status
@Injectable({ providedIn: 'root' })
export class ProjectAdviceService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  private path(projectId: number, employeeId: number): string {
    return `${this.api}/projects/${projectId}/employees/${employeeId}`;
  }

  getGap(projectId: number, employeeId: number): Observable<ProjectGapResponse> {
    return this.http.get<ProjectGapResponse>(`${this.path(projectId, employeeId)}/gaps`);
  }
  // A 204 arrives as a null body
  getAdvice(projectId: number, employeeId: number): Observable<AdviceResponse | null> {
    return this.http.get<AdviceResponse | null>(`${this.path(projectId, employeeId)}/suggestions`);
  }
  generate(projectId: number, employeeId: number): Observable<AdviceResponse> {
    return this.http.post<AdviceResponse>(`${this.path(projectId, employeeId)}/suggestions`, {});
  }
  setItemStatus(itemId: number, status: AdviceStatus): Observable<void> {
    return this.http.patch<void>(`${this.api}/skill-advice-items/${itemId}/status`, { status });
  }
}