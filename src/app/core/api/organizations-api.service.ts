import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateOrganizationRequest,
  CreateRoleRequest,
  InviteMemberRequest,
  OrgMember,
  OrgRole,
  Organization,
  OrganizationTreeNode,
  UpdateMemberRequest,
  UpdateOrganizationRequest,
  UpdateRoleRequest,
} from '../models/organization.models';

@Injectable({ providedIn: 'root' })
export class OrganizationsApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  list(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.api}/organizations`);
  }

  current(): Observable<Organization> {
    return this.http.get<Organization>(`${this.api}/organizations/current`);
  }

  tree(): Observable<OrganizationTreeNode[]> {
    return this.http.get<OrganizationTreeNode[]>(`${this.api}/organizations/tree`);
  }

  create(body: CreateOrganizationRequest): Observable<Organization> {
    return this.http.post<Organization>(`${this.api}/organizations`, body);
  }

  update(id: string, body: UpdateOrganizationRequest): Observable<Organization> {
    return this.http.patch<Organization>(`${this.api}/organizations/${id}`, body);
  }

  uploadLogo(id: string, file: File): Observable<Organization> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Organization>(
      `${this.api}/organizations/${id}/logo`,
      form,
    );
  }

  deleteLogo(id: string): Observable<Organization> {
    return this.http.delete<Organization>(`${this.api}/organizations/${id}/logo`);
  }

  listPermissions(): Observable<Array<{ key: string; description?: string }>> {
    return this.http.get<Array<{ key: string; description?: string }>>(
      `${this.api}/organizations/permissions`,
    );
  }

  listMembers(orgId: string): Observable<OrgMember[]> {
    return this.http.get<OrgMember[]>(
      `${this.api}/organizations/${orgId}/members`,
    );
  }

  inviteMember(orgId: string, body: InviteMemberRequest): Observable<OrgMember> {
    return this.http.post<OrgMember>(
      `${this.api}/organizations/${orgId}/members`,
      body,
    );
  }

  resendInvite(orgId: string, userId: string): Observable<unknown> {
    return this.http.post(
      `${this.api}/organizations/${orgId}/members/${userId}/resend-invite`,
      {},
    );
  }

  updateMember(
    orgId: string,
    userId: string,
    body: UpdateMemberRequest,
  ): Observable<OrgMember> {
    return this.http.patch<OrgMember>(
      `${this.api}/organizations/${orgId}/members/${userId}`,
      body,
    );
  }

  removeMember(orgId: string, userId: string): Observable<unknown> {
    return this.http.delete(
      `${this.api}/organizations/${orgId}/members/${userId}`,
    );
  }

  listRoles(orgId: string): Observable<OrgRole[]> {
    return this.http.get<OrgRole[]>(`${this.api}/organizations/${orgId}/roles`);
  }

  createRole(orgId: string, body: CreateRoleRequest): Observable<OrgRole> {
    return this.http.post<OrgRole>(
      `${this.api}/organizations/${orgId}/roles`,
      body,
    );
  }

  updateRole(
    orgId: string,
    roleId: string,
    body: UpdateRoleRequest,
  ): Observable<OrgRole> {
    return this.http.patch<OrgRole>(
      `${this.api}/organizations/${orgId}/roles/${roleId}`,
      body,
    );
  }
}
