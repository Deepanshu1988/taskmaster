// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

interface LoginResponse {
  role: string;
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  getToken(): string | null {
    const currentUser = this.currentUserValue;
    return currentUser?.token || localStorage.getItem('token');
  }
  [x: string]: any;
  private apiUrl = 'http://localhost:3000/api';
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  private loading = false;
  constructor(private http: HttpClient, private router: Router) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<any>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  public isLoggedIn(): boolean {
    const currentUser = this.currentUserValue;
    return !!currentUser && !!currentUser.token;
  }

  public get isLoading() {
    return this.loading;
  }

  private handleAuthError(error: any): Observable<never> {
    if (error.status === 401 || error.error?.name === 'TokenExpiredError') {
      // Clear the expired token and user data
      this.logout();
      // Redirect to login page
      this.router.navigate(['/login']);
    }
    return throwError(() => error);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    if (this.loading) {
      return new Observable<LoginResponse>();
    }
    
    this.loading = true;
    
    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();
    
    console.log('Attempting login with:', { email: cleanEmail, password: cleanPassword });
    
    if (!cleanEmail || !cleanPassword) {
      this.loading = false;
      throw new Error('Email and password are required');
    }

    // Create request options
    const requestOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Create request body
    const requestBody = {
      email: cleanEmail,
      password: cleanPassword
    };

    console.log('Sending login request with body:', requestBody);

    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { 
      email: cleanEmail, 
      password: cleanPassword 
    }, requestOptions).pipe(
      tap({
        next: (response) => {
          console.log('Login response:', response);
          
          if (!response || !response.token) {
            this.loading = false;
            throw new Error('Invalid response from server');
          }
          
          // Store both the full response (which includes user data) and the token separately
          localStorage.setItem('currentUser', JSON.stringify(response));
          localStorage.setItem('token', response.token);  // Store token separately for easy access
          this.currentUserSubject.next(response);
          this.loading = false;
        },
        error: (error) => {
          console.error('Login error:', error);
          this.loading = false;
          let errorMessage = 'Login failed. Please check your credentials.';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          throw new Error(errorMessage);
        }
      }),
      catchError(this.handleAuthError.bind(this))
    );
  }

  /*checkAuthState() {
    const currentUser = this.currentUserValue;
    const token = this.getToken();
    console.log('Current user:', currentUser);
    console.log('Token exists:', !!token);
    console.log('Is authenticated:', this.isLoggedIn());
    return {
      isAuthenticated: this.isLoggedIn(),
      user: currentUser,
      hasToken: !!token
    };
  }*/
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, { 
      token, 
      newPassword 
    });
  }

  logout() {
    // Remove user data and token from local storage
    
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    }
  }
