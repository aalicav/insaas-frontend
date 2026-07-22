import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, switchMap, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AcceptInvitationRequest,
  AuthMeResponse,
  AuthTokenResponse,
  LoginRequest,
  PermissionKey,
} from '../models/auth.models';

const TOKEN_KEY = 'ih.accessToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = environment.apiBaseUrl;

  readonly me = signal<AuthMeResponse | null>(null);
  readonly loadingMe = signal(false);
  readonly permissions = computed(() => this.me()?.permissions ?? []);
  readonly isAuthenticated = computed(() => !!this.getToken() && !!this.me());

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private setToken(token: string | null): void {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  hasPermission(permission: PermissionKey | PermissionKey[]): boolean {
    const perms = this.permissions();
    const required = Array.isArray(permission) ? permission : [permission];
    return required.every((p) => perms.includes(p));
  }

  hasAnyPermission(permissions: PermissionKey[]): boolean {
    const perms = this.permissions();
    return permissions.some((p) => perms.includes(p));
  }

  login(payload: LoginRequest): Observable<AuthTokenResponse> {
    return this.http
      .post<AuthTokenResponse>(`${this.api}/auth/login`, payload)
      .pipe(
        tap((res) => this.setToken(res.accessToken)),
        switchMap((res) => this.refreshMe().pipe(map(() => res))),
      );
  }

  acceptInvitation(payload: AcceptInvitationRequest): Observable<AuthTokenResponse> {
    return this.http
      .post<AuthTokenResponse>(`${this.api}/auth/invitations/accept`, payload)
      .pipe(
        tap((res) => this.setToken(res.accessToken)),
        switchMap((res) => this.refreshMe().pipe(map(() => res))),
      );
  }

  switchOrganization(organizationId: string): Observable<AuthTokenResponse> {
    return this.http
      .post<AuthTokenResponse>(`${this.api}/auth/switch-organization`, {
        organizationId,
      })
      .pipe(
        tap((res) => this.setToken(res.accessToken)),
        switchMap((res) => this.refreshMe().pipe(map(() => res))),
      );
  }

  updateProfile(name: string): Observable<{ id: string; email: string; name: string | null; status: string }> {
    return this.http
      .patch<{ id: string; email: string; name: string | null; status: string }>(
        `${this.api}/auth/me`,
        { name },
      )
      .pipe(tap(() => void this.refreshMe().subscribe()));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.api}/auth/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  refreshMe(): Observable<AuthMeResponse | null> {
    if (!this.getToken()) {
      this.me.set(null);
      return of(null);
    }
    this.loadingMe.set(true);
    return this.http.get<AuthMeResponse>(`${this.api}/auth/me`).pipe(
      tap((me) => {
        this.me.set(me);
        this.loadingMe.set(false);
      }),
      catchError((err) => {
        this.loadingMe.set(false);
        if (err?.status === 401) {
          this.clearSession();
          return of(null);
        }
        return throwError(() => err);
      }),
    );
  }

  restoreSession(): Observable<AuthMeResponse | null> {
    if (!this.getToken()) return of(null);
    return this.refreshMe();
  }

  logout(navigate = true): void {
    this.clearSession();
    if (navigate) void this.router.navigate(['/login']);
  }

  private clearSession(): void {
    this.setToken(null);
    this.me.set(null);
  }
}
