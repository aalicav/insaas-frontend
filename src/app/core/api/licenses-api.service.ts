import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LicenseAssignmentAction,
  LicenseAssignmentActionsResponse,
  LicenseAssignmentMutationResponse,
} from '../models/licenses.models';

@Injectable({ providedIn: 'root' })
export class LicensesApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  listActions(assignmentId: string): Observable<LicenseAssignmentActionsResponse> {
    return this.http.get<LicenseAssignmentActionsResponse>(
      `${this.api}/license-assignments/${assignmentId}/actions`,
    );
  }

  runAction(
    assignmentId: string,
    action: LicenseAssignmentAction,
  ): Observable<LicenseAssignmentMutationResponse> {
    return this.http.post<LicenseAssignmentMutationResponse>(
      `${this.api}/license-assignments/${assignmentId}/${action}`,
      {},
    );
  }
}
