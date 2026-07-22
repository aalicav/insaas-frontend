import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Contract,
  ContractListParams,
  ContractSuggestions,
  CreateContractRequest,
  GenerateCommitmentsRequest,
  GenerateCommitmentsResponse,
  UpdateContractRequest,
} from '../models/contracts.models';

@Injectable({ providedIn: 'root' })
export class ContractsApiService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/contracts`;

  list(filters: ContractListParams = {}): Observable<Contract[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Contract[]>(this.api, { params });
  }

  get(id: string): Observable<Contract> {
    return this.http.get<Contract>(`${this.api}/${id}`);
  }

  suggestions(managedAppId: string): Observable<ContractSuggestions> {
    return this.http.get<ContractSuggestions>(`${this.api}/suggestions`, {
      params: new HttpParams().set('managedAppId', managedAppId),
    });
  }

  create(body: CreateContractRequest): Observable<Contract> {
    return this.http.post<Contract>(this.api, body);
  }

  update(id: string, body: UpdateContractRequest): Observable<Contract> {
    return this.http.patch<Contract>(`${this.api}/${id}`, body);
  }

  generateCommitments(
    id: string,
    body: GenerateCommitmentsRequest = {},
  ): Observable<GenerateCommitmentsResponse> {
    return this.http.post<GenerateCommitmentsResponse>(
      `${this.api}/${id}/generate-commitments`,
      body,
    );
  }
}
