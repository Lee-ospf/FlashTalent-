import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmployeeListItem } from '../models/index';

// GET api/Recruiter/hr
export interface HrListItem {
  userId: number;
  fullName: string;
  email: string;
  jobTitle: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private http = inject(HttpClient);

  getHr(): Observable<HrListItem[]> {
    return this.http.get<HrListItem[]>(`${environment.apiUrl}/Recruiter/hr`);
  }

  getEmployees(): Observable<EmployeeListItem[]> {
    return this.http.get<EmployeeListItem[]>(`${environment.apiUrl}/employees`);
  }
}
