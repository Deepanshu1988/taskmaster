import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';

export interface TimeEntry {
  id?: number;
  task_id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  duration?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  task_title?: string;
  project_name?: string;
  formatted_duration?: string;
}

export interface TimeSummary {
  totalEntries: number;
  totalTime: number;
  activeEntries: number;
  formattedTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimeTrackingService {
  private apiUrl = `${environment.apiUrl}/time-tracking`;

  constructor(private http: HttpClient) {}

  // Start tracking time for a task
  startTracking(taskId: number, notes: string = ''): Observable<{ success: boolean; timeEntryId?: number; message?: string }> {
    return this.http.post<{ success: boolean; timeEntryId?: number; message?: string }>(
      `${this.apiUrl}/start`,
      { task_id: taskId, notes }
    );
  }

  // Stop tracking time for a task
  stopTracking(timeEntryId: number, notes: string = ''): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/stop`,
      { timeEntryId, notes }
    );
  }

  // Get time entries for a specific task
 
  getTaskTimeEntries(taskId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tasks/${taskId}/entries`);
  }
  // Get current user's time entries
  getUserTimeEntries(params?: { startDate?: string; endDate?: string }): Observable<{ success: boolean; data: TimeEntry[] }> {
    return this.http.get<{ success: boolean; data: TimeEntry[] }>(
      `${this.apiUrl}/user/entries`,
      { params: params as any }
    );
  }

  // Get active time entry for current user
  getActiveTimeEntry(): Observable<{ success: boolean; data: TimeEntry | null; message?: string }> {
    return this.http.get<{ success: boolean; data: TimeEntry | null; message?: string }>(
      `${this.apiUrl}/active`
    );
  }

  // Get time summary for a task
  getTaskTimeSummary(taskId: number): Observable<{ success: boolean; data: TimeSummary }> {
    return this.http.get<{ success: boolean; data: TimeSummary }>(
      `${this.apiUrl}/task/${taskId}/summary`
    );
  }

  // Delete a time entry
  deleteTimeEntry(timeEntryId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/${timeEntryId}`,
      { withCredentials: true }
    );
  }

  // Format seconds to HH:MM:SS
  formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  }
  
  // Calculate duration between two dates in seconds
  calculateDuration(start: Date, end: Date = new Date()): number {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }
}
