import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

// In project.service.ts
export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(params: any = {}) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Add timestamp to prevent caching
    const cacheBuster = { t: Date.now().toString() };
    const allParams = { ...params, ...cacheBuster };
    
    return {
      headers: headers,
      params: new HttpParams({
        fromObject: allParams
      })
    };
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    return throwError(() => error);
  }

  createProject(project: Omit<Project, 'id'>): Observable<Project> {
    return this.http.post<ApiResponse<Project>>(
      `${this.apiUrl}/projects/post/projects`,
      project,
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  getProjects(): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(
      `${this.apiUrl}/projects/get/projects`,
      this.getAuthHeaders()
    ).pipe(
      map(response => {
        // Handle both direct array and { success, data } response formats
        const projects = Array.isArray(response) ? response : (response?.data || []);
        return projects.map(p => ({
          id: p.id.toString(),
          name: p.name,
          description: p.description,
          startDate: new Date(p.start_date || p.startDate),
          endDate: new Date(p.end_date || p.endDate),
          status: p.status
        }));
      }),
      catchError(this.handleError)
    );
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<ApiResponse<Project>>(
      `${this.apiUrl}/projects/put/projects/${id}`,
      project,
      this.getAuthHeaders()
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  deleteProject(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/projects/delete/projects/${id}`,
      this.getAuthHeaders()
    ).pipe(
      map(response => response.success),
      catchError(this.handleError)
    );
  }
}
