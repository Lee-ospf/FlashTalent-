import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
// Adjust this import (and the base URL below) to match how ProjectService builds its URLs.
import { environment } from '../../../environments/environment';
import {
  CertificationExpiryItem,
  CertificationExpiryStatus,
  CertificationNoExpiryItem,
  ComplianceSummary,
  ExpiryFilterStatus,
} from '../models/index';

// Same order as the C# CertificationExpiryStatus enum. Only used if the API sends enums as numbers.
const STATUS_BY_NUMBER: CertificationExpiryStatus[] = [
  'NoExpiryDate',
  'Valid',
  'ExpiringIn90',
  'ExpiringIn30',
  'ExpiringIn7',
  'Expired',
];

@Injectable({ providedIn: 'root' })
export class ComplianceService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/compliance`;

  // GET api/compliance/summary
  getSummary(): Observable<ComplianceSummary> {
    return this.http.get<ComplianceSummary>(`${this.base}/summary`);
  }

  // GET api/compliance/certifications/expiring?status=&search=
  getExpiring(status?: ExpiryFilterStatus, search?: string): Observable<CertificationExpiryItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);

    return this.http
      .get<CertificationExpiryItem[]>(`${this.base}/certifications/expiring`, { params })
      .pipe(
        map((items) =>
          items.map((i) => ({
            ...i,
            status:
              typeof i.status === 'number'
                ? STATUS_BY_NUMBER[i.status as number]
                : i.status,
          })),
        ),
      );
  }

  // GET api/compliance/certifications/no-expiry-date?search=
  getNoExpiry(search?: string): Observable<CertificationNoExpiryItem[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);

    return this.http.get<CertificationNoExpiryItem[]>(
      `${this.base}/certifications/no-expiry-date`,
      { params },
    );
  }
}