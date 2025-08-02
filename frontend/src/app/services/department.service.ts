import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'If-Modified-Since': new Date().toUTCString()
    });
  }

  private getRequestOptions(params: any = {}) {
    // Add timestamp to prevent caching
    const cacheBuster = { t: Date.now().toString() };
    const allParams = { ...params, ...cacheBuster };
    
    return {
      headers: this.getHeaders(),
      params: new HttpParams({
        fromObject: allParams
      })
    };
  }

  getDepartments(): Observable<{ success: boolean; data: Department[] }> {
    const getUrl = `${this.apiUrl}/get/departments`;
    this.logRequest('GET', getUrl);
    
    return this.http.get<{ success: boolean; data: Department[] }>(
      getUrl,
      this.getRequestOptions()
    ).pipe(
      tap({
        next: (response) => {
          this.logResponse('GET', getUrl, response);
          if (response.success && response.data) {
            this.departmentsSubject.next(response.data);
          }
        },
        error: (error) => this.logError('GET', getUrl, error)
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
    const url = `${this.apiUrl}/post/departments`;
    this.logRequest('POST', url, departmentData);
    return this.http.post(url, departmentData, this.getRequestOptions()).pipe(
      tap({
        next: (response) => {
          this.logResponse('POST', url, response);
          this.getDepartments().subscribe();
        },
        error: (error) => this.logError('POST', url, error)
      }),
      catchError(this.handleError)
    );
  }

  updateDepartment(id: number, name: string, description: string = ''): Observable<Department> {
    const url = `${this.apiUrl}/put/departments/${id}`;
    const body = { name, description };
    this.logRequest('PUT', url, body);
    
    return this.http.put<{success: boolean; data: Department}>(url, body, this.getRequestOptions()).pipe(
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
    const url = `${this.apiUrl}/delete/departments/${id}`;
    this.logRequest('DELETE', url);
    
    return this.http.delete<{success: boolean; message?: string}>(url, this.getRequestOptions()).pipe(
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