import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('stores token and loads me on login', () => {
    service.login({ email: 'a@b.com', password: 'password1' }).subscribe();

    const loginReq = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    loginReq.flush({
      accessToken: 'token-123',
      tokenType: 'Bearer',
      expiresIn: '8h',
      orgId: 'org-1',
      membershipId: 'm-1',
      viaOrgId: null,
      permissions: ['people:read'],
    });

    const meReq = http.expectOne(`${environment.apiBaseUrl}/auth/me`);
    meReq.flush({
      id: 'u-1',
      email: 'a@b.com',
      name: 'Ana',
      status: 'active',
      activeOrganization: {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        logoKey: null,
        viaOrgId: null,
      },
      permissions: ['people:read'],
      memberships: [],
    });

    expect(service.getToken()).toBe('token-123');
    expect(service.me()?.email).toBe('a@b.com');
    expect(service.hasPermission('people:read')).toBeTrue();
  });

  it('clears session on logout', () => {
    sessionStorage.setItem('ih.accessToken', 'x');
    service.logout(false);
    expect(service.getToken()).toBeNull();
    expect(service.me()).toBeNull();
  });
});
