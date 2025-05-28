import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';
  // private userId = localStorage.getItem('id')?.trim() || '';


  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token')?.trim();
    console.log('Current token from localStorage:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      console.error('No token found in localStorage');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
  
    console.log('Token start/end:', 
      token.substring(0, 10) + '...' + token.substring(token.length - 10));
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
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
  return this.http.get<User[]>(`${this.apiUrl}`, { 
    headers: this.getHeaders() 
  }).pipe(
    catchError(this.handleError)
  );
}
getUsersByRole(role: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}?role=${role}`, { 
    headers: this.getHeaders() 
  }).pipe(
    catchError(this.handleError)
  );
}
// Add this method to your UserService
// getCurrentUser(): Observable<User> {
//   if (!this.userId) {
//     return throwError(() => new Error('No user ID found in localStorage'));
//   }
//   return this.http.get<User>(`${this.apiUrl}/${this.userId}`, { 
//     headers: this.getHeaders() 
//   }).pipe(
//     catchError(this.handleError)
//   );
// }

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