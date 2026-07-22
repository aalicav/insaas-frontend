import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BulkCreateOrgUnitsRequest,
  BulkCreateUnitsResponse,
  BulkMapPeopleRequest,
  BulkMapResponse,
  CreateOrgUnitRequest,
  MappingSuggestionsResponse,
  OrgUnit,
  OrgUnitListParams,
  OrgUnitMembersResponse,
  OrgViews,
  OwnerReportsRunResponse,
  UpdateOrgUnitRequest,
  UpdateOrgViewsRequest,
} from '../models/org-structure.models';

@Injectable({ providedIn: 'root' })
export class OrgStructureApiService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/org-structure`;

  getViews(): Observable<OrgViews> {
    return this.http.get<OrgViews>(`${this.api}/views`);
  }

  updateViews(body: UpdateOrgViewsRequest): Observable<OrgViews> {
    return this.http.patch<OrgViews>(`${this.api}/views`, body);
  }

  mappingSuggestions(): Observable<MappingSuggestionsResponse> {
    return this.http.get<MappingSuggestionsResponse>(
      `${this.api}/mapping-suggestions`,
    );
  }

  bulkMap(body: BulkMapPeopleRequest): Observable<BulkMapResponse> {
    return this.http.post<BulkMapResponse>(`${this.api}/bulk-map`, body);
  }

  bulkCreateUnits(body: BulkCreateOrgUnitsRequest): Observable<BulkCreateUnitsResponse> {
    return this.http.post<BulkCreateUnitsResponse>(`${this.api}/units/bulk`, body);
  }

  runOwnerReports(): Observable<OwnerReportsRunResponse> {
    return this.http.post<OwnerReportsRunResponse>(
      `${this.api}/owner-reports/run`,
      {},
    );
  }

  listUnits(filters: OrgUnitListParams = {}): Observable<OrgUnit[]> {
    let params = new HttpParams();
    if (filters.kind) params = params.set('kind', filters.kind);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<OrgUnit[]>(`${this.api}/units`, { params });
  }

  getUnit(id: string): Observable<OrgUnit> {
    return this.http.get<OrgUnit>(`${this.api}/units/${id}`);
  }

  listUnitMembers(id: string): Observable<OrgUnitMembersResponse> {
    return this.http.get<OrgUnitMembersResponse>(`${this.api}/units/${id}/members`);
  }

  createUnit(body: CreateOrgUnitRequest): Observable<OrgUnit> {
    return this.http.post<OrgUnit>(`${this.api}/units`, body);
  }

  updateUnit(id: string, body: UpdateOrgUnitRequest): Observable<OrgUnit> {
    return this.http.patch<OrgUnit>(`${this.api}/units/${id}`, body);
  }

  deactivateUnit(id: string): Observable<OrgUnit> {
    return this.http.delete<OrgUnit>(`${this.api}/units/${id}`);
  }
}
