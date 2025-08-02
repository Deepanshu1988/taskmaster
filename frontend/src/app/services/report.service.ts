import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TimeReportEntry, TaskCompletion, UserProductivity, ReportResponse } from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  exportReport(filters: any, type: string): Observable<Blob> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params = params.set(key, filters[key]);
    });
    params = params.set('type', type);
    
    // Get the token
    const token = this.authService.getToken();
    
    // Set up headers
    const headers: { [key: string]: string } = {
      'Accept': 'application/json'
    };
  
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  
    return this.http.get(`${this.baseUrl}/export`, { 
      params, 
      headers,
      responseType: 'blob' as 'blob',
      withCredentials: true
    });
  }

  private baseUrl = 'http://localhost:3000/api/reports';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getTimeReport(filters: any): Observable<ReportResponse> {
    let params = new HttpParams();
    
    // Convert filter object to query parameters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key].toString());
      }
    });

    const url = `${this.baseUrl}/time-report`;
    console.log('Making request to:', url, 'with params:', params.toString());

    // Get the token safely
    const token = this.authService.getToken();
    
    // Set up headers with the token if available
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.http.get<ReportResponse>(url, { 
      params,
      headers,
      withCredentials: true  // Important for sending cookies/session
    }).pipe(
      catchError(error => {
        console.error('API Error Details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error,
          headers: error.headers
        });
        return throwError(() => new Error(
          `Failed to load report data: ${error.status} ${error.statusText}`
        ));
      })
    );
  }

  getTimeSummary(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params = params.set(key, filters[key]);
    });
    return this.http.get(`${this.baseUrl}/time-summary`, { params });
  }

  getTaskCompletion(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params = params.set(key, filters[key]);
    });
    return this.http.get(`${this.baseUrl}/task-completion`, { params });
  }

  // Add methods for other reports
}