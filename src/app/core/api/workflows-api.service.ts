import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateOrganizationWorkflowRequest,
  OffboardPersonRequest,
  OnboardPersonRequest,
  OrganizationWorkflow,
  StartWorkflowRunRequest,
  TriggerDescriptor,
  TriggerResult,
  TriggerWorkflowRequest,
  UpdateOrganizationWorkflowRequest,
  WorkflowRun,
  WorkflowRunsParams,
} from '../models/workflows.models';

@Injectable({ providedIn: 'root' })
export class WorkflowsApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  listTriggerTypes(): Observable<TriggerDescriptor[]> {
    return this.http.get<TriggerDescriptor[]>(
      `${this.api}/workflow-trigger-types`,
    );
  }

  listTemplates(): Observable<OrganizationWorkflow[]> {
    return this.http.get<OrganizationWorkflow[]>(`${this.api}/workflow-templates`);
  }

  listWorkflows(): Observable<OrganizationWorkflow[]> {
    return this.http.get<OrganizationWorkflow[]>(`${this.api}/workflows`);
  }

  createWorkflow(
    body: CreateOrganizationWorkflowRequest,
  ): Observable<OrganizationWorkflow> {
    return this.http.post<OrganizationWorkflow>(`${this.api}/workflows`, body);
  }

  updateWorkflow(
    id: string,
    body: UpdateOrganizationWorkflowRequest,
  ): Observable<OrganizationWorkflow> {
    return this.http.patch<OrganizationWorkflow>(
      `${this.api}/workflows/${id}`,
      body,
    );
  }

  trigger(body: TriggerWorkflowRequest): Observable<TriggerResult> {
    return this.http.post<TriggerResult>(`${this.api}/workflows/trigger`, body);
  }

  startRun(id: string, body: StartWorkflowRunRequest): Observable<WorkflowRun> {
    return this.http.post<WorkflowRun>(`${this.api}/workflows/${id}/runs`, body);
  }

  onboardPerson(
    personId: string,
    body: OnboardPersonRequest = {},
  ): Observable<TriggerResult> {
    return this.http.post<TriggerResult>(
      `${this.api}/people/${personId}/onboard`,
      body,
    );
  }

  offboardPerson(
    personId: string,
    body: OffboardPersonRequest = {},
  ): Observable<TriggerResult> {
    return this.http.post<TriggerResult>(
      `${this.api}/people/${personId}/offboard`,
      body,
    );
  }

  listRuns(filters: WorkflowRunsParams = {}): Observable<WorkflowRun[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<WorkflowRun[]>(`${this.api}/workflow-runs`, { params });
  }

  getRun(id: string): Observable<WorkflowRun> {
    return this.http.get<WorkflowRun>(`${this.api}/workflow-runs/${id}`);
  }

  /** Alias of listRuns via /lifecycle/runs */
  listLifecycleRuns(filters: WorkflowRunsParams = {}): Observable<WorkflowRun[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<WorkflowRun[]>(`${this.api}/lifecycle/runs`, { params });
  }

  getLifecycleRun(id: string): Observable<WorkflowRun> {
    return this.http.get<WorkflowRun>(`${this.api}/lifecycle/runs/${id}`);
  }

  approveStep(runId: string, stepId: string): Observable<WorkflowRun> {
    return this.http.post<WorkflowRun>(
      `${this.api}/workflow-runs/${runId}/steps/${stepId}/approve`,
      {},
    );
  }

  rejectStep(runId: string, stepId: string): Observable<WorkflowRun> {
    return this.http.post<WorkflowRun>(
      `${this.api}/workflow-runs/${runId}/steps/${stepId}/reject`,
      {},
    );
  }
}
