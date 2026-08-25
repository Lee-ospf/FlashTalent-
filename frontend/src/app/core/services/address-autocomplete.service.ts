import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AddressDetails } from '../models';

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

@Injectable({ providedIn: 'root' })
export class AddressAutocompleteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/AddressAutocomplete`;

  getSuggestions(input: string): Observable<any> {
    return this.http
      .get<any>(`${this.base}?input=${encodeURIComponent(input)}`)
      .pipe(catchError(() => of({ suggestions: [] })));
  }

  getDetails(placeId: string): Observable<AddressDetails | null> {
    return this.http
      .get<AddressDetails>(`${this.base}/details?placeId=${encodeURIComponent(placeId)}`)
      .pipe(catchError(() => of(null)));
  }
}