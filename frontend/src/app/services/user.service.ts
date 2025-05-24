import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('Current token from localStorage:', token ? 'Token exists' : 'No token found');
    
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
    }
  
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    });
  
    console.log('Request headers:', JSON.stringify(headers));
    return headers;
  }

  private handleError(error: HttpErrorResponse) {
  console.error('API Error:', {
    status: error.status,
    statusText: error.statusText,
    error: error.error,
    url: error.url
  });
  
  let errorMessage = 'Something went wrong; please try again later.';
  if (error.status === 0) {
    errorMessage = 'Unable to connect to the server. Please check your internet connection.';
  } else if (error.status === 401) {
    errorMessage = 'Authentication required. Please log in again.';
  } else if (error.status === 403) {
    errorMessage = 'You do not have permission to access this resource.';
  } else if (error.status === 404) {
    errorMessage = 'The requested resource was not found.';
  } else if (error.error?.message) {
    errorMessage = error.error.message;
  }
  
  return throwError(() => new Error(errorMessage));
}

getUsers(): Observable<User[]> {
  return this.http.get<User[]>(this.apiUrl).pipe(
    catchError(this.handleError)
  );
}
  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  updateUser(id: number, user: Partial<User>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, user, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }
}