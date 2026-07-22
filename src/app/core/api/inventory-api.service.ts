import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateManagedAppRequest,
  InventoryTag,
  ManagedApp,
  ManagedAppListParams,
  PromoteManagedAppRequest,
  UpdateManagedAppRequest,
} from '../models/inventory.models';

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/inventory`;

  listApps(filters: ManagedAppListParams = {}): Observable<ManagedApp[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ManagedApp[]>(`${this.api}/apps`, { params });
  }

  listTags(): Observable<InventoryTag[]> {
    return this.http.get<InventoryTag[]>(`${this.api}/tags`);
  }

  getApp(id: string): Observable<ManagedApp> {
    return this.http.get<ManagedApp>(`${this.api}/apps/${id}`);
  }

  createApp(body: CreateManagedAppRequest): Observable<ManagedApp> {
    return this.http.post<ManagedApp>(`${this.api}/apps`, body);
  }

  updateApp(id: string, body: UpdateManagedAppRequest): Observable<ManagedApp> {
    return this.http.patch<ManagedApp>(`${this.api}/apps/${id}`, body);
  }

  deleteApp(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.api}/apps/${id}`);
  }

  promote(body: PromoteManagedAppRequest): Observable<ManagedApp> {
    return this.http.post<ManagedApp>(`${this.api}/apps/promote`, body);
  }
}
