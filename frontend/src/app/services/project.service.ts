import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  createProject(project: Omit<Project, 'id'>): Observable<Project> {
    console.log('Creating project:', project);
    return this.http.post<Project>(
      `${this.apiUrl}/projects`,
      project,
      this.getAuthHeaders()
    ).pipe(
      tap({
        next: (response) => console.log('Project created:', response),
        error: (error) => console.error('Error creating project:', error)
      })
    );
  }

  getProjects(): Observable<Project[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/projects`,
      this.getAuthHeaders()
    ).pipe(
      map(projects => projects.map(p => ({
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        startDate: new Date(p.start_date || p.startDate),
        endDate: new Date(p.end_date || p.endDate),
        status: p.status
      })))
    );
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(
      `${this.apiUrl}/projects/${id}`,
      project,
      this.getAuthHeaders()
    );
  }

  deleteProject(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/projects/${id}`,
      this.getAuthHeaders()
    );
  }
}
