import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdviceResponse,
  AdviceStatus,
  CareerGoalResponse,
  CareerGoalStatus,
  SaveCareerGoalRequest,
} from '../models/index';

// Employee career goals and the advice generated for them.
@Injectable({ providedIn: 'root' })
export class CareerGoalsService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getMine(status?: CareerGoalStatus): Observable<CareerGoalResponse[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<CareerGoalResponse[]>(
      `${this.api}/career-goals/mine`,
      { params },
    );
  }
  create(body: SaveCareerGoalRequest): Observable<CareerGoalResponse> {
    return this.http.post<CareerGoalResponse>(`${this.api}/career-goals`, body);
  }
  update(
    id: number,
    body: SaveCareerGoalRequest,
  ): Observable<CareerGoalResponse> {
    return this.http.put<CareerGoalResponse>(
      `${this.api}/career-goals/${id}`,
      body,
    );
  }
  achieve(id: number): Observable<CareerGoalResponse> {
    return this.http.post<CareerGoalResponse>(
      `${this.api}/career-goals/${id}/achieve`,
      {},
    );
  }
  archive(id: number): Observable<CareerGoalResponse> {
    return this.http.post<CareerGoalResponse>(
      `${this.api}/career-goals/${id}/archive`,
      {},
    );
  }

  // 204 (nothing generated yet) arrives as a null body
  getAdvice(goalId: number): Observable<AdviceResponse | null> {
    return this.http.get<AdviceResponse | null>(
      `${this.api}/career-goals/${goalId}/advice`,
    );
  }
  // Uses one of 5 generations per employee per 24 hours. 429 = limit reached, 502 = the AI failed.
  generateAdvice(goalId: number): Observable<AdviceResponse> {
    return this.http.post<AdviceResponse>(
      `${this.api}/career-goals/${goalId}/advice`,
      {},
    );
  }
  setItemStatus(itemId: number, status: AdviceStatus): Observable<void> {
    return this.http.patch<void>(
      `${this.api}/skill-advice-items/${itemId}/status`,
      { status },
    );
  }
}
