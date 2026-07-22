import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateSpendEntryRequest,
  SpendEntry,
  SpendListParams,
} from '../models/spend.models';

@Injectable({ providedIn: 'root' })
export class SpendApiService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/spend-entries`;

  list(filters: SpendListParams = {}): Observable<SpendEntry[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<SpendEntry[]>(this.api, { params });
  }

  create(body: CreateSpendEntryRequest): Observable<SpendEntry> {
    return this.http.post<SpendEntry>(this.api, body);
  }
}
