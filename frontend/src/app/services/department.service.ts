import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environments';

export interface Department {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/departments`;
  private departmentsSubject = new BehaviorSubject<Department[]>([]);
  departments$ = this.departmentsSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('API Base URL:', this.apiUrl);
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    
    if (error.status) {
      if (error.status === 0) {
        return throwError(() => new Error('Unable to connect to the server. Please check your internet connection.'));
      }
      
      if (error.error) {
        const serverError = error.error;
        if (serverError.message) {
          return throwError(() => new Error(serverError.message));
        }
        if (serverError.error) {
          return throwError(() => new Error(serverError.error));
        }
      }
      
      return throwError(() => new Error(`HTTP Error: ${error.status} - ${error.statusText || 'Unknown error'}`));
    }
    
    return throwError(() => new Error(error.message || 'An unexpected error occurred. Please try again.'));
  }

  private logRequest(method: string, url: string, body?: any) {
    console.log(`[${method}] ${url}`, body ? 'with body:' : '', body || '');
  }

  private logResponse(method: string, url: string, response: any) {
    console.log(`[${method} Response] ${url}:`, response);
  }

  private logError(method: string, url: string, error: any) {
    console.error(`[${method} Error] ${url}:`, error);
  }

  getDepartments(): Observable<{ success: boolean; data: Department[] }> {
    this.logRequest('GET', this.apiUrl);
    return this.http.get<{ success: boolean; data: Department[] }>(this.apiUrl).pipe(
      tap({
        next: (response) => {
          this.logResponse('GET', this.apiUrl, response);
          if (response.success && response.data) {
            this.departmentsSubject.next(response.data);
          }
        },
        error: (error) => this.logError('GET', this.apiUrl, error)
      }),
      catchError(this.handleError)
    );
  }

  getDepartmentNames(): Observable<{ success: boolean; data: string[] }> {
    return this.getDepartments().pipe(
      map((response: { success: boolean; data: Department[] }) => ({
        success: true,
        data: response.data.map((dept: { name: any; }) => dept.name)
      })),
      catchError(error => {
        console.error('Error in getDepartmentNames:', error);
        return of({ success: false, data: [] });
      })
    );
  }

  createDepartment(departmentData: any): Observable<any> {
    this.logRequest('POST', this.apiUrl, departmentData);
    return this.http.post(this.apiUrl, departmentData).pipe(
      tap({
        next: (response) => {
          this.logResponse('POST', this.apiUrl, response);
          this.getDepartments().subscribe();
        },
        error: (error) => this.logError('POST', this.apiUrl, error)
      }),
      catchError(this.handleError)
    );
  }

  updateDepartment(id: number, name: string, description: string = ''): Observable<Department> {
    const url = `${this.apiUrl}/${id}`;
    const body = { name, description };
    this.logRequest('PUT', url, body);
    
    return this.http.put<{success: boolean; data: Department}>(url, body).pipe(
      tap({
        next: (response) => {
          this.logResponse('PUT', url, response);
          if (response.success && response.data) {
            const currentDepartments = this.departmentsSubject.value || [];
            const index = currentDepartments.findIndex(d => d.id === id);
            if (index !== -1) {
              const updatedDepartments = [...currentDepartments];
              updatedDepartments[index] = response.data;
              this.departmentsSubject.next(updatedDepartments);
            }
          }
        },
        error: (error) => this.logError('PUT', url, error)
      }),
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  deleteDepartment(id: number): Observable<boolean> {
    const url = `${this.apiUrl}/${id}`;
    this.logRequest('DELETE', url);
    
    return this.http.delete<{success: boolean; message?: string}>(url).pipe(
      tap({
        next: (response) => {
          this.logResponse('DELETE', url, response);
          if (response.success) {
            const currentDepartments = this.departmentsSubject.value || [];
            const updatedDepartments = currentDepartments.filter(d => d.id !== id);
            this.departmentsSubject.next(updatedDepartments);
          }
        },
        error: (error) => this.logError('DELETE', url, error)
      }),
      map(response => response.success),
      catchError(error => {
        const errorMsg = error.error?.message || 'Failed to delete department. It may be in use by other records.';
        return throwError(() => new Error(errorMsg));
      })
    );
  }
}