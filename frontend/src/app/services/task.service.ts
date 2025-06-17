import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap, map, of } from 'rxjs';
import { Task } from '../models/task.model';

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user?: {
    username: string;
    email?: string;
    avatar_url?: string;
  };
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  getTaskById(taskId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tasks/${taskId}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            ...response.data,
            total_time: response.data.total_time || 0,
            last_time_tracked: response.data.last_time_tracked || null
          };
        }
        return response;
      })
    );
  }
  authService: any;
  getTaskCounts(): Observable<{pending: number, in_progress: number, completed: number}> {
    return this.http.get<{success: boolean, data: {pending: number, in_progress: number, completed: number}}>(
      `${this.apiUrl}/counts`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || { pending: 0, in_progress: 0, completed: 0 }),
      catchError(error => {
        console.error('Error fetching task counts:', error);
        return of({ pending: 0, in_progress: 0, completed: 0 });
      })
    );
  }

  getTasksByUser(userId: any): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/user/${userId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }
  private readonly apiUrl = 'http://localhost:3000/api/tasks';
  private readonly cache = new Map<string, any>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || error.statusText || 'Server error';
    }
    
    console.error('API Error:', {
      status: error.status,
      message: errorMessage,
      url: error.url
    });
    
    return throwError(() => new Error(errorMessage));
  }

  private getWithCache<T>(url: string, cacheKey: string): Observable<T> {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return new Observable(subscriber => {
        subscriber.next(cached.data);
        subscriber.complete();
      });
    }

    return this.http.get<T>(url, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError),
      tap(data => {
        this.cache.set(cacheKey, {
          data,
          timestamp: now
        });
      })
    );
  }

  // Task Operations
  // In task.service.ts
getTasks(): Observable<Task[]> {
  return this.http.get<ApiResponse<Task[]>>(`${this.apiUrl}`, {
    headers: this.getHeaders()
  }).pipe(
    tap(response => console.log('Raw API response:', response)),
    map(response => {
      if (response.success && Array.isArray(response.data)) {
        return response.data.map(task => {
          // Ensure progress is properly handled
          const progress = task.progress !== undefined ? task.progress : task.Progress;
          return {
            ...task,
            progress: progress !== undefined ? Number(progress) : 0,
            project: task['project'] || null,
            assignee: task['assignee'] || null,
            total_time: task['total_time'] || 0,
            last_time_tracked: task['last_time_tracked'] || null
          };
        });
      }
      return [];
    }),
    tap(tasks => console.log('Processed tasks:', tasks))
  );
}

  // In task.service.ts
/*getTask(): Observable<any> {
  const token = localStorage.getItem('token');
  if (!token) {
    return throwError('No authentication token found');
  }

  return this.http.get<any>(`${this.apiUrl}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }).pipe(
    map(response => {
      // Additional filtering in the frontend if needed
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.filter(task => 
          task.assignee_role === 'admin' || task.creator_role === 'admin'
        );
      }
      return response;
    }),
    catchError(error => {
      console.error('Error in getTasks:', error);
      return throwError(error);
    })
  );
}*/
getTasksByUserRole(): Observable<Task[]> {
  const currentUser = this.authService.currentUserValue;
  const isAdmin = currentUser ? (currentUser.user?.role === 'admin' || currentUser.role === 'admin') : false;
  
  if (isAdmin) {
    return this.getTasks();
  } else {
    const userId = currentUser?.id;
    return this.http.get<Task[]>(`${this.apiUrl}/user/${userId}`);
  }
}
getTask(): Observable<ApiResponse<Task[]>> {
  const token = localStorage.getItem('token');
  if (!token) {
    return throwError(() => new Error('No authentication token found'));
  }

  return this.http.get<ApiResponse<Task[]>>(`${this.apiUrl}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }).pipe(
    map(response => {
      // Additional filtering in the frontend if needed
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.filter(task => 
          task['assignee_role'] === 'admin' || task['creator_role'] === 'admin'
        );
      }
      return response;
    }),
    catchError(error => {
      console.error('Error in getTasks:', error);
      return throwError(() => error);
    })
  );
}

  createTask(task: Partial<Task>): Observable<Task> {
    // Invalidate relevant caches
    this.cache.clear();
    
    return this.http.post<Task>(
      this.apiUrl, 
      task, 
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateTask(id: number, updates: Partial<Task>): Observable<Task> {
    // Ensure progress is a number between 0-100
    if (updates.progress !== undefined) {
      updates.progress = Math.min(100, Math.max(0, Number(updates.progress) || 0));
    }
    
    return this.http.patch<Task>(
      `${this.apiUrl}/${id}`,
      updates,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // In task.service.ts
deleteTask(taskId: number): Observable<any> {
  // Invalidate caches
  this.cache.delete(`task_${taskId}`);
  this.cache.clear(); // Clear all task caches since the list will change

  return this.http.delete(
    `${this.apiUrl}/${taskId}`,
    { 
      headers: this.getHeaders(),
      withCredentials: true
    }
  ).pipe(
    catchError(this.handleError)
  );
}
  // Task Status Operations
  updateTaskStatus(taskId: number, status: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(
      `${this.apiUrl}/${taskId}/status`,
      { status },
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  // Task Comments
  getTaskComments(taskId: number): Observable<TaskComment[]> {
    const cacheKey = `task_${taskId}_comments`;
    return this.getWithCache<TaskComment[]>(
      `${this.apiUrl}/${taskId}/comments`,
      cacheKey
    );
  }

  addComment(taskId: number, comment: { content: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${taskId}/comments`,
      comment,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }
  // User-specific Tasks
  getMyTasks(params?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    overdue?: boolean;
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(
      `${this.apiUrl}/my-tasks`,
      { 
        params: httpParams,
        headers: this.getHeaders() 
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Helper Methods
  clearCache(): void {
    this.cache.clear();
  }
}