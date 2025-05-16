// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

interface LoginResponse {
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

    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, requestBody, requestOptions).pipe(
      tap({
        next: (response) => {
          console.log('Login response:', response);
          
          if (!response || !response.token) {
            this.loading = false;
            throw new Error('Invalid response from server');
          }
          
          // Store user data and token
          localStorage.setItem('currentUser', JSON.stringify(response));
          this.currentUserSubject.next(response);
        },
        error: (error) => {
          console.error('Login error details:', {
            status: error.status,
            error: error.error,
            message: error.message,
            url: error.url
          });
          
          this.loading = false;
          
          let errorMessage = 'An unexpected error occurred. Please try again.';
          
          if (error.error && typeof error.error === 'object') {
            errorMessage = error.error.message || errorMessage;
          } else if (error.status === 401) {
            errorMessage = 'Invalid email or password';
          } else if (error.status === 400) {
            errorMessage = 'Bad request. Please check your input.';
          } else if (error.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          }
          
          throw new Error(errorMessage);
        },
        complete: () => {
          // Not needed since we reset loading in next and error
        }
      })
    );
  }

  logout() {
    // Remove user from local storage and set current user to null
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}