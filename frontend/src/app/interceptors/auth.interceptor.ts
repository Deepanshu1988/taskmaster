import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('token');
    
    // Skip modification for reset password and auth endpoints
    if (request.url.includes('/reset-password') || request.url.includes('/auth/')) {
      return next.handle(request);
    }
    
    // Clone the request and add the authorization header
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Skip 401 handling for reset password and auth endpoints
        if (error.status === 401 && !request.url.includes('/reset-password') && !request.url.includes('/auth/')) {
          // If 401 Unauthorized, clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}