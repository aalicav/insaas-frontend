import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateIdentityRequest,
  IdentityMutationResponse,
} from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class IdentitiesApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  suspend(id: string): Observable<IdentityMutationResponse> {
    return this.http.post<IdentityMutationResponse>(
      `${this.api}/identities/${id}/suspend`,
      {},
    );
  }

  delete(id: string): Observable<IdentityMutationResponse> {
    return this.http.post<IdentityMutationResponse>(
      `${this.api}/identities/${id}/delete`,
      {},
    );
  }

  createOnConnection(
    connectionId: string,
    body: CreateIdentityRequest,
  ): Observable<IdentityMutationResponse> {
    return this.http.post<IdentityMutationResponse>(
      `${this.api}/connections/${connectionId}/identities`,
      body,
    );
  }
}
