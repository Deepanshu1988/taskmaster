import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, tap, map, of, filter } from 'rxjs';
import { Task } from '../models/task.model';
import { TaskAttachment } from './attachment.service';

export interface TaskComment {
  data(data: any): unknown;
  success: any;
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
  uploadTaskAttachments(taskId: number, formData: FormData): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type here - let the browser set it with the correct boundary
    });
  
    return this.http.post<{success: boolean, message: string, data: any}>(
      `${this.apiUrl}/get/task/${taskId}/attachments`,  // Make sure this matches your backend route
      formData,
      { headers }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Upload error:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        return throwError(() => new Error('Failed to upload files'));
      })
    );
  }
  deleteAttachment(attachmentId: number) {
    throw new Error('Method not implemented.');
  }
  getTaskAttachments(taskId: number): Observable<TaskAttachment[]> {
    return this.http.get<{ success: boolean; data: TaskAttachment[] }>(
      `${this.apiUrl}/get/task/${taskId}/attachments`
    ).pipe(
      map(response => response.data || [])
    );
  }
  downloadFile(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/get/task-attachments/${attachmentId}/download`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }
  notifyTaskUpdate(arg0: { taskId: number; updatedBy: any; updates: { title: any; description: any; project_id: any; assigned_to: any; priority: any; status: any; due_date: string | null; progress: number; comments: any; }; comment: any; }): Observable<unknown> {
    throw new Error('Method not implemented.');
  }
  getTaskById(taskId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/get/task/${taskId}`).pipe(
      map((response: any) => {
        if (response.success && response.data) {
          return {
            ...response.data,
            total_time: response.data.total_time || 0,
            last_time_tracked: response.data.last_time_tracked || null,
            comments: response.data.comments || []  // Ensure comments are included
          };
        }
        return response;
      })
    );
  }
  authService: any;
  getTaskCounts(): Observable<{pending: number, in_progress: number, completed: number}> {
    const headers = this.getHeaders()
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('Expires', '0')
      .set('If-Modified-Since', new Date().toUTCString());

    return this.http.get<{success: boolean, data: {pending: number, in_progress: number, completed: number}}>(
      `${this.apiUrl}/get/counts`,
      { 
        headers: headers,
        params: new HttpParams().set('t', Date.now().toString()) // Add timestamp to prevent caching
      }
    ).pipe(
      map(response => response?.data || { pending: 0, in_progress: 0, completed: 0 }),
      catchError(error => {
        console.error('Error fetching task counts:', error);
        return of({ pending: 0, in_progress: 0, completed: 0 });
      })
    );
  }

  getTasksByUser(userId: any): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/get/tasks/user/${userId}`,
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

  getTasks(): Observable<Task[]> {
    const headers = this.getHeaders().set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('Expires', '0')
      .set('If-Modified-Since', new Date().toUTCString());
      
    return this.http.get<ApiResponse<Task[]>>(`${this.apiUrl}/get/tasks`, {
      headers: headers,
      params: new HttpParams().set('t', Date.now().toString()) // Add timestamp to prevent caching
    }).pipe(
      tap(response => console.log('Raw tasks API response:', response)),
      map(response => {
        let tasks: any[] = [];
        
        // Handle both response formats
        if (response && response.success !== undefined) {
          tasks = response.data || [];
        } else {
          tasks = response as unknown as Task[];
        }

        // Process each task to ensure consistent data structure
        return tasks.map(task => {
          // Check if assignee is set but has name "Unassigned"
          const hasValidAssignee = task.assignee && 
                                 task.assignee.name && 
                                 task.assignee.name.toLowerCase() !== 'unassigned';

          // Extract assignee name
          const assigneeName = hasValidAssignee 
            ? task.assignee.name 
            : (task.assigned_to_name && task.assigned_to_name.toLowerCase() !== 'unassigned' 
                ? task.assigned_to_name 
                : 'Unassigned');

          return {
            ...task,
            project_name: task.project?.name || task.project_name || 'No Project',
            project: task.project || { name: 'No Project' },
            assigned_to_name: assigneeName,
            assignee: hasValidAssignee ? task.assignee : null,
            comments: task.comments || ''
            
          };
        });
      }),
      tap(tasks => console.log('Processed tasks with projects and assignees:', tasks)),
      catchError(this.handleError)
    );
  }

  getTasksByUserRole(): Observable<Task[]> {
  const currentUser = this.authService.currentUserValue;
  const isAdmin = currentUser ? (currentUser.user?.role === 'admin' || currentUser.role === 'admin') : false;
  
  if (isAdmin) {
    return this.getTasks();
  } else {
    const userId = currentUser?.id;
    return this.http.get<Task[]>(`${this.apiUrl}/get/tasks/user/${userId}`);
  }
}
getTask(): Observable<ApiResponse<Task[]>> {
  const token = localStorage.getItem('token');
  if (!token) {
    return throwError(() => new Error('No authentication token found'));
  }

  return this.http.get<ApiResponse<Task[]>>(`${this.apiUrl}/get/tasks`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }).pipe(
    map(response => {
      if (response.data && Array.isArray(response.data)) {
        // Map over tasks and ensure comments field exists
        response.data = response.data.map(task => ({
          ...task,
          comments: task.comments || ''  // Ensure comments field exists
        }));

        // Admin-specific filtering
        const currentUser = this.authService.currentUserValue;
        if (currentUser?.role !== 'admin') {
          response.data = response.data.filter(task => 
            task['assignee_role'] === 'admin' || task['creator_role'] === 'admin'
          );
        }
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
      `${this.apiUrl}/create/task`, 
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
    
    return this.http.put<Task>(
      `${this.apiUrl}/update/task/${id}`,
      updates,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteTask(taskId: number): Observable<any> {
    // Invalidate caches
    this.cache.delete(`task_${taskId}`);
    this.cache.clear(); // Clear all task caches since the list will change

    return this.http.delete(
      `${this.apiUrl}/delete/task/${taskId}`,
      { 
        headers: this.getHeaders(),
        withCredentials: true
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateTaskStatus(taskId: number, status: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(
      `${this.apiUrl}/update/task/${taskId}/status`,
      { status },
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  getTaskComments(taskId: number): Observable<TaskComment[]> {
    return this.http.get<{success: boolean, data: TaskComment[]}>(
      `${this.apiUrl}/get/task/${taskId}/comments`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('Error fetching comments:', error);
        return of([]);
      })
    );
  } 

  addTaskComment(taskId: number, comment: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/create/task/${taskId}/comments`,
      { comment },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error in addTaskComment:', error);
        return throwError(() => error);
      })
    );
  }

  updateComment(commentId: number, comment: string): Observable<TaskComment> {
    return this.http.put<ApiResponse<TaskComment>>(
      `${this.apiUrl}/update/comments/${commentId}`,
      { comment },
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  deleteComment(commentId: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/delete/comments/${commentId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.success || false),
      catchError(this.handleError)
    );
  }

  getTaskCommentsOld(taskId: number): Observable<TaskComment[]> {
    const cacheKey = `task_${taskId}_comments`;
    return this.getWithCache<TaskComment[]>(
      `${this.apiUrl}/get/task/${taskId}/comments`,
      cacheKey
    );
  }

  addComment(taskId: number, comment: { content: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/create/task/${taskId}/comments`,
      {comment},
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

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
      `${this.apiUrl}/get/my-tasks`,
      { 
        params: httpParams,
        headers: this.getHeaders() 
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  uploadTaskAttachment(taskId: number, formData: FormData): Observable<HttpEvent<any>> {
    return this.http.post(
      `${this.apiUrl}/get/task/${taskId}/attachments`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteTaskAttachment(attachmentId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/delete/task-attachments/${attachmentId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private getFileUploadHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type here - let the browser set it with the correct boundary
    });
  }
}
