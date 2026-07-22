import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpRequest,
  HttpHandlerFn,
  HttpResponse,
} from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { FeedbackService } from '../feedback/feedback.service';

describe('authInterceptor', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let feedback: jasmine.SpyObj<FeedbackService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['getToken', 'logout']);
    feedback = jasmine.createSpyObj('FeedbackService', ['warning']);
    auth.getToken.and.returnValue('abc');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        { provide: AuthService, useValue: auth },
        { provide: FeedbackService, useValue: feedback },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('adds Authorization header', (done) => {
    const req = new HttpRequest('GET', 'http://localhost:3000/people');
    const next: HttpHandlerFn = (r) => {
      expect(r.headers.get('Authorization')).toBe('Bearer abc');
      done();
      return of(new HttpResponse({ status: 200 })) as Observable<HttpEvent<unknown>>;
    };
    TestBed.runInInjectionContext(() => authInterceptor(req, next).subscribe());
  });

  it('logs out and redirects on 401 for protected routes', (done) => {
    const req = new HttpRequest('GET', 'http://localhost:3000/people');
    const next: HttpHandlerFn = () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            statusText: 'Unauthorized',
            url: 'http://localhost:3000/people',
          }),
      );

    TestBed.runInInjectionContext(() =>
      authInterceptor(req, next).subscribe({
        error: () => {
          expect(auth.logout).toHaveBeenCalledWith(false);
          expect(feedback.warning).toHaveBeenCalled();
          expect(router.navigate).toHaveBeenCalled();
          done();
        },
      }),
    );
  });
});
