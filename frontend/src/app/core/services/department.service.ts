import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DepartmentResponse, EmployeeListItem } from '../models';

export interface CreateDepartmentRequest {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);

  getAll(): Observable<DepartmentResponse[]> {
    return this.http.get<DepartmentResponse[]>(
      `${environment.apiUrl}/Department`,
    );
  }

  create(request: CreateDepartmentRequest): Observable<DepartmentResponse> {
    return this.http
      .post<DepartmentResponse>(`${environment.apiUrl}/Department`, request)
      .pipe(
        catchError((err: unknown) => {
          if (!(err instanceof HttpErrorResponse)) return throwError(() => err);

          const body = err.error;
          const message =
            typeof body === 'string' && body
              ? body
              : (body?.message ?? 'Something went wrong. Please try again.');

          return throwError(() => new Error(message));
        }),
      );
  }
  getEmployees(
    departmentId: number,
    status = 'Active',
  ): Observable<EmployeeListItem[]> {
    return this.http.get<EmployeeListItem[]>(
      `${environment.apiUrl}/Department/${departmentId}/employees`,
      { params: { status } },
    );
  }
}
