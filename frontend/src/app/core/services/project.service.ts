import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectListItem, ProjectStatus } from '../models';

// ───────────────────────── Models (match the backend DTOs) ─────────────────────────

export interface ProjectSkillResponse {
  skillId: number;
  skillName: string;
  isRequired: boolean;
  minimumLevel: string; // 'Beginner' | 'Intermediate' | 'Expert'
}

export interface ProjectResponse {
  projectId: number;
  name: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  status: ProjectStatus;
  departmentId?: number | null;
  departmentName?: string | null;
  requiredQualifications: string;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt?: string | null;
  lastMatchedAt?: string | null;
  memberCount: number;
  skills: ProjectSkillResponse[];
}

export interface ProjectSkillRequest {
  skillId: number;
  isRequired: boolean;
  minimumLevel: string;
}

// Used for both create and edit (an edit replaces the content).
export interface SaveProjectRequest {
  name: string;
  description: string;
  departmentId: number | null;
  startDate: string | null; // yyyy-MM-dd
  endDate: string | null;
  requiredQualifications: string | null;
  skills: ProjectSkillRequest[];
}


// ── Matching ──
export type GapStatus = 'Met' | 'BelowLevel' | 'Missing';

export interface SkillGapItem {
  skillId: number;
  skillName: string;
  isRequired: boolean;
  requiredLevel: string | number; // string if the API sends enums as text, number otherwise
  employeeLevel?: string | number | null; // null when Missing
  status: GapStatus | number;
}

export interface ExtraSkillItem {
  skillId: number;
  skillName: string;
  level: string | number;
}

export interface GapAnalysisResult {
  skills: SkillGapItem[];
  extraSkills: ExtraSkillItem[];
  requiredTotal: number;
  requiredMet: number;
  niceToHaveTotal: number;
  niceToHaveMet: number;
  meetsAllRequiredSkills: boolean;
}

export interface ProjectMatchResponse {
  projectMatchId: number;
  employeeId: number;
  fullName: string;
  jobTitle?: string | null;
  departmentName?: string | null;
  score: number; // 0-100, from the AI (capped by the rules)
  reasoning: string;
  gaps: GapAnalysisResult; // from the rules
  activeProjectCount: number; // includes this project if the employee is already a member
  isMember: boolean;
  isDismissed: boolean;
  profileUpdatedAt?: string | null;
  computedAt: string;
}

export interface ProjectMatchRunResponse {
  projectId: number;
  lastMatchedAt?: string | null;
  matches: ProjectMatchResponse[];
}

export interface ProjectMemberResponse {
  projectMemberId: number;
  employeeId: number;
  fullName: string;
  jobTitle?: string | null;
  departmentName?: string | null;
  addedByName: string;
  addedAt: string;
}
// ── Extract from document ──
export interface SkillSuggestion { skillId: number; name: string; }
export interface DraftSkill {
  skillId: number; skillName: string; isRequired: boolean;
  minimumLevel: string | number;
}
export interface UnmatchedDraftSkill {
  extractedName: string; isRequired: boolean;
  minimumLevel: string | number; suggestions: SkillSuggestion[];
}
export interface ProjectDraftResponse {
  name: string; description: string;
  startDate?: string | null; endDate?: string | null;
  requiredQualifications: string;
  skills: DraftSkill[]; unmatchedSkills: UnmatchedDraftSkill[];
  warnings: string[];
}

//upload project documents
export interface ProjectDocumentResponse {
  projectDocumentId: number;
  fileName: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
}

// ───────────────────────── Service ─────────────────────────
//
// Routes (HR, Admin):
//   GET   api/projects?status=&search=
//   GET   api/projects/{id}
//   POST  api/projects
//   PUT   api/projects/{id}          (closed projects can't be edited)
//   PATCH api/projects/{id}/close
//   POST  api/projects/{id}/matches/run
//   GET   api/projects/{id}/matches?includeDismissed=
//   POST  api/projects/{id}/matches/{employeeId}/dismiss | restore
//   GET   api/projects/{id}/members   POST (body { employeeId })   DELETE .../{employeeId}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/projects`; // assumes apiUrl already ends in /api

  getAll(status?: ProjectStatus, search?: string): Observable<ProjectListItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ProjectListItem[]>(this.base, { params });
  }

  getById(id: number): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.base}/${id}`);
  }

  create(req: SaveProjectRequest): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(this.base, req);
  }

  update(id: number, req: SaveProjectRequest): Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${this.base}/${id}`, req);
  }

  close(id: number): Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`${this.base}/${id}/close`, {});
  }

  // POST api/projects/extract. Preview only; nothing is saved.
extract(file: File): Observable<ProjectDraftResponse> {
  const body = new FormData();
  body.append('file', file); // the field name must be "file"
  return this.http.post<ProjectDraftResponse>(`${this.base}/extract`, body);
}

  // ── Matching ──
  runMatch(id: number): Observable<ProjectMatchRunResponse> {
    return this.http.post<ProjectMatchRunResponse>(`${this.base}/${id}/matches/run`, {});
  }

  getMatches(id: number, includeDismissed = true): Observable<ProjectMatchRunResponse> {
    const params = new HttpParams().set('includeDismissed', includeDismissed);
    return this.http.get<ProjectMatchRunResponse>(`${this.base}/${id}/matches`, { params });
  }

  dismissMatch(id: number, employeeId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/matches/${employeeId}/dismiss`, {});
  }

  restoreMatch(id: number, employeeId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/matches/${employeeId}/restore`, {});
  }

  // ── Members ──
  getMembers(id: number): Observable<ProjectMemberResponse[]> {
    return this.http.get<ProjectMemberResponse[]>(`${this.base}/${id}/members`);
  }

  addMember(id: number, employeeId: number): Observable<ProjectMemberResponse> {
    return this.http.post<ProjectMemberResponse>(`${this.base}/${id}/members`, { employeeId });
  }

  removeMember(id: number, employeeId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/members/${employeeId}`);
  }

  // ── Project files (api/projects/{id}/documents) ──
getDocuments(id: number): Observable<ProjectDocumentResponse[]> {
  return this.http.get<ProjectDocumentResponse[]>(`${this.base}/${id}/documents`);
}

uploadDocument(id: number, file: File): Observable<ProjectDocumentResponse> {
  const body = new FormData();
  body.append('file', file); // field name must be "file"
  return this.http.post<ProjectDocumentResponse>(`${this.base}/${id}/documents`, body);
}

// Blob so the auth interceptor still adds the token (a plain <a href> would not).
downloadDocument(id: number, documentId: number): Observable<Blob> {
  return this.http.get(`${this.base}/${id}/documents/${documentId}`, { responseType: 'blob' });
}

deleteDocument(id: number, documentId: number): Observable<void> {
  return this.http.delete<void>(`${this.base}/${id}/documents/${documentId}`);
}
}