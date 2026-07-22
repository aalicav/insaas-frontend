import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CatalogApp,
  CatalogGroup,
  CatalogIdentity,
  CatalogLicense,
  CatalogListParams,
} from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  private params(filters: CatalogListParams = {}): HttpParams {
    let params = new HttpParams();
    if (filters.provider) params = params.set('provider', filters.provider);
    if (filters.connectionId) params = params.set('connectionId', filters.connectionId);
    return params;
  }

  listIdentities(filters: CatalogListParams = {}): Observable<CatalogIdentity[]> {
    return this.http.get<CatalogIdentity[]>(`${this.api}/identities`, {
      params: this.params(filters),
    });
  }

  listGroups(filters: CatalogListParams = {}): Observable<CatalogGroup[]> {
    return this.http.get<CatalogGroup[]>(`${this.api}/groups`, {
      params: this.params(filters),
    });
  }

  listLicenses(filters: CatalogListParams = {}): Observable<CatalogLicense[]> {
    return this.http.get<CatalogLicense[]>(`${this.api}/licenses`, {
      params: this.params(filters),
    });
  }

  listApps(filters: CatalogListParams = {}): Observable<CatalogApp[]> {
    return this.http.get<CatalogApp[]>(`${this.api}/apps`, {
      params: this.params(filters),
    });
  }
}
