import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ShadowApp,
  ShadowItListParams,
  ShadowItSummary,
} from '../models/shadow-it.models';

@Injectable({ providedIn: 'root' })
export class ShadowItApiService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/shadow-it`;

  list(filters: ShadowItListParams = {}): Observable<ShadowApp[]> {
    let params = new HttpParams();
    if (filters.q?.trim()) params = params.set('q', filters.q.trim());
    if (filters.includeIgnored) params = params.set('includeIgnored', 'true');
    return this.http.get<ShadowApp[]>(this.api, { params });
  }

  summary(): Observable<ShadowItSummary> {
    return this.http.get<ShadowItSummary>(`${this.api}/summary`);
  }

  ignore(id: string): Observable<ShadowApp> {
    return this.http.post<ShadowApp>(`${this.api}/${id}/ignore`, {});
  }

  reopen(id: string): Observable<ShadowApp> {
    return this.http.post<ShadowApp>(`${this.api}/${id}/reopen`, {});
  }
}
