import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<any[]>(`${this.apiUrl}/projects`).pipe(
      map(projects => projects.map(p => ({
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        startDate: new Date(p.start_date),
        endDate: new Date(p.end_date),
        status: p.status
      })))
    );
  }
}
