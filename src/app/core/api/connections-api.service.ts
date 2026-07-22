import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Connection,
  CreateConnectionRequest,
  CreateConnectionResponse,
  IntegrationProvider,
  PatchIntegrationRequest,
  SubmitCredentialsResponse,
  SyncStatusResponse,
} from '../models/connection.models';

@Injectable({ providedIn: 'root' })
export class ConnectionsApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  listIntegrations(all = false): Observable<IntegrationProvider[]> {
    let params = new HttpParams();
    if (all) params = params.set('all', '1');
    return this.http.get<IntegrationProvider[]>(`${this.api}/integrations`, {
      params,
    });
  }

  getIntegration(key: string): Observable<IntegrationProvider> {
    return this.http.get<IntegrationProvider>(`${this.api}/integrations/${key}`);
  }

  patchIntegration(
    key: string,
    body: PatchIntegrationRequest,
  ): Observable<IntegrationProvider> {
    return this.http.patch<IntegrationProvider>(
      `${this.api}/integrations/${key}`,
      body,
    );
  }

  listConnections(): Observable<Connection[]> {
    return this.http.get<Connection[]>(`${this.api}/connections`);
  }

  getConnection(id: string): Observable<Connection> {
    return this.http.get<Connection>(`${this.api}/connections/${id}`);
  }

  createConnection(
    body: CreateConnectionRequest,
  ): Observable<CreateConnectionResponse> {
    return this.http.post<CreateConnectionResponse>(
      `${this.api}/connections`,
      body,
    );
  }

  submitCredentials(
    id: string,
    fields: Record<string, string>,
  ): Observable<SubmitCredentialsResponse> {
    return this.http.post<SubmitCredentialsResponse>(
      `${this.api}/connections/${id}/credentials`,
      { fields },
    );
  }

  startSync(id: string): Observable<{ id: string; status: string }> {
    return this.http.post<{ id: string; status: string }>(
      `${this.api}/connections/${id}/sync`,
      {},
    );
  }

  syncStatus(id: string): Observable<SyncStatusResponse> {
    return this.http.get<SyncStatusResponse>(
      `${this.api}/connections/${id}/sync/status`,
    );
  }
}
